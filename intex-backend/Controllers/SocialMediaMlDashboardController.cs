using System.Globalization;
using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

/// <summary>
/// ML-style social dashboard payload for the admin SPA (does not modify existing social-media analytics).
/// </summary>
[ApiController]
[Route("api")]
[Authorize(Roles = "Admin")]
public class SocialMediaMlDashboardController : ControllerBase
{
    private static readonly string[] DayOrder =
    [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ];

    private readonly ApplicationDbContext _db;

    public SocialMediaMlDashboardController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("social-media/ml-dashboard")]
    public async Task<ActionResult<SocialMediaMlDashboardResponse>> GetMlDashboard(CancellationToken ct)
    {
        var posts = await _db.SocialMediaPosts.AsNoTracking().ToListAsync(ct);
        if (posts.Count == 0)
        {
            var empty = new SocialMediaMlDashboardMeta(0, 0, 0, 0);
            return Ok(new SocialMediaMlDashboardResponse(
                empty,
                new LabelDecimalSeries([], []),
                new LabelDecimalSeries([], []),
                new LabelDecimalSeries([], []),
                new LabelDecimalSeries([], []),
                new LabelDecimalSeries([], []),
                new LabelDecimalSeries([], []),
                new LabelIntSeries([], []),
                Array.Empty<SocialMediaPostPlatformCombo>()
            ));
        }

        var attributedCounts = await _db.Donations.AsNoTracking()
            .Where(d => d.ReferralPostId != null)
            .GroupBy(d => d.ReferralPostId!.Value)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);

        var enriched = posts.Select(p =>
        {
            var attributed = attributedCounts.GetValueOrDefault(p.PostId, 0);
            var hasSignal = p.DonationReferrals > 0 || attributed > 0;
            return new EnrichedPost(p, attributed, hasSignal);
        }).ToList();

        var meta = BuildMeta(enriched);
        var platformReferrals = ToLabelDecimal(
            enriched.GroupBy(x => x.Post.Platform)
                .Select(g => (Key: g.Key, Avg: g.Average(z => (decimal)z.Post.DonationReferrals)))
                .OrderByDescending(x => x.Avg));

        var platformSignal = ToLabelDecimal(
            enriched.GroupBy(x => x.Post.Platform)
                .Select(g => (Key: g.Key, Avg: g.Average(z => z.HasDonationSignal ? 1m : 0m)))
                .OrderByDescending(x => x.Avg));

        var typeStats = enriched.GroupBy(x => x.Post.PostType)
            .Select(g => new
            {
                PostType = g.Key,
                N = g.Count(),
                AvgReferrals = g.Average(z => (decimal)z.Post.DonationReferrals),
                AvgEngagement = g.Average(z => z.Post.EngagementRate)
            })
            .Where(x => x.N >= 8)
            .OrderByDescending(x => x.AvgReferrals)
            .ToList();

        var postTypeReferrals = new LabelDecimalSeries(
            typeStats.Select(x => x.PostType).ToList(),
            typeStats.Select(x => Math.Round(x.AvgReferrals, 4)).ToList());

        var postTypeEngagement = new LabelDecimalSeries(
            typeStats.Select(x => x.PostType).ToList(),
            typeStats.Select(x => Math.Round(x.AvgEngagement, 4)).ToList());

        var hourReferrals = ToLabelDecimal(
            enriched.GroupBy(x => x.Post.PostHour)
                .OrderBy(g => g.Key)
                .Select(g => (Key: $"{g.Key:00}:00", Avg: g.Average(z => (decimal)z.Post.DonationReferrals))));

        var dowPresent = enriched.Select(x => x.Post.DayOfWeek).Distinct().ToHashSet();
        var dowOrdered = DayOrder.Where(dowPresent.Contains).ToList();
        var dowAvgs = dowOrdered.Select(d =>
        {
            var g = enriched.Where(x => x.Post.DayOfWeek == d).ToList();
            var avg = g.Count == 0 ? 0m : g.Average(z => (decimal)z.Post.DonationReferrals);
            return (Day: d, Avg: avg);
        }).ToList();

        var cadence = BuildCadence(enriched);

        var combos = enriched
            .GroupBy(x => (x.Post.PostType, x.Post.Platform))
            .Select(g => new SocialMediaPostPlatformCombo(
                $"{g.Key.PostType} | {g.Key.Platform}",
                Math.Round(g.Average(z => (decimal)z.Post.DonationReferrals), 4)))
            .OrderByDescending(x => x.AvgReferrals)
            .Take(24)
            .ToList();

        var response = new SocialMediaMlDashboardResponse(
            meta,
            platformReferrals,
            platformSignal,
            postTypeReferrals,
            postTypeEngagement,
            hourReferrals,
            new LabelDecimalSeries(
                dowAvgs.Select(x => x.Day).ToList(),
                dowAvgs.Select(x => Math.Round(x.Avg, 4)).ToList()),
            cadence,
            combos
        );

        return Ok(response);
    }

    private static SocialMediaMlDashboardMeta BuildMeta(IReadOnlyList<EnrichedPost> enriched)
    {
        var byWeek = enriched
            .GroupBy(p => WeekKey(p.Post.CreatedAt))
            .Select(g => g.Count())
            .ToList();

        if (byWeek.Count == 0)
            return new SocialMediaMlDashboardMeta(enriched.Count, 0, 0, 0);

        var mean = byWeek.Average();
        var sorted = byWeek.OrderBy(x => x).ToList();
        var median = sorted.Count % 2 == 1
            ? sorted[sorted.Count / 2]
            : (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2.0;
        var variance = byWeek.Sum(x => (x - mean) * (x - mean)) / byWeek.Count;
        var std = Math.Sqrt(variance);

        return new SocialMediaMlDashboardMeta(enriched.Count, mean, median, std);
    }

    private static string WeekKey(DateTime dt)
    {
        var year = ISOWeek.GetYear(dt);
        var week = ISOWeek.GetWeekOfYear(dt);
        return $"{year}-W{week:00}";
    }

    private static LabelIntSeries BuildCadence(IReadOnlyList<EnrichedPost> enriched)
    {
        var ordered = enriched
            .GroupBy(p => WeekKey(p.Post.CreatedAt))
            .OrderBy(g => g.Key)
            .ToList();

        return new LabelIntSeries(
            ordered.Select(g => g.Key).ToList(),
            ordered.Select(g => g.Count()).ToList());
    }

    private static LabelDecimalSeries ToLabelDecimal(IEnumerable<(string Key, decimal Avg)> rows)
    {
        var list = rows.ToList();
        return new LabelDecimalSeries(
            list.Select(x => x.Key).ToList(),
            list.Select(x => Math.Round(x.Avg, 4)).ToList());
    }

    private readonly record struct EnrichedPost(SocialMediaPost Post, int AttributedGiftCount, bool HasDonationSignal);
}
