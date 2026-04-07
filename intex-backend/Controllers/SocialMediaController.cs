using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/social-media")]
[Authorize(Roles = "Admin")]
public class SocialMediaController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SocialMediaController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("posts")]
    public async Task<ActionResult<PagedResult<SocialMediaPost>>> Posts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? platform = null,
        [FromQuery] string? postType = null,
        [FromQuery] string? campaignName = null
    )
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 25 : pageSize;

        var q = _db.SocialMediaPosts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(platform))
            q = q.Where(p => p.Platform == platform);

        if (!string.IsNullOrWhiteSpace(postType))
            q = q.Where(p => p.PostType == postType);

        if (!string.IsNullOrWhiteSpace(campaignName))
            q = q.Where(p => p.CampaignName == campaignName);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<SocialMediaPost>(items, page, pageSize, total));
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<SocialMediaAnalyticsResponse>> Analytics()
    {
        var topPlatform = await _db.SocialMediaPosts.AsNoTracking()
            .GroupBy(p => p.Platform)
            .Select(g => new { Platform = g.Key, Avg = g.Average(x => x.EngagementRate) })
            .OrderByDescending(x => x.Avg)
            .Select(x => x.Platform)
            .FirstOrDefaultAsync();

        var topPostType = await _db.SocialMediaPosts.AsNoTracking()
            .GroupBy(p => p.PostType)
            .Select(g => new { PostType = g.Key, Donations = g.Sum(x => x.DonationReferrals) })
            .OrderByDescending(x => x.Donations)
            .Select(x => x.PostType)
            .FirstOrDefaultAsync();

        var avgByPlatform = await _db.SocialMediaPosts.AsNoTracking()
            .GroupBy(p => p.Platform)
            .Select(g => new
            {
                Platform = g.Key,
                AvgEngagementRate = (decimal?)g.Average(x => x.EngagementRate) ?? 0m
            })
            .OrderByDescending(x => x.AvgEngagementRate)
            .ToListAsync();

        var avgByPlatformItems = avgByPlatform
            .Select(x => new AvgEngagementRateByPlatformItem(x.Platform, x.AvgEngagementRate))
            .ToList();

        var bestHour = await _db.SocialMediaPosts.AsNoTracking()
            .GroupBy(p => p.PostHour)
            .Select(g => new { Hour = g.Key, Avg = g.Average(x => x.EngagementRate) })
            .OrderByDescending(x => x.Avg)
            .Select(x => (int?)x.Hour)
            .FirstOrDefaultAsync();

        var bestDay = await _db.SocialMediaPosts.AsNoTracking()
            .GroupBy(p => p.DayOfWeek)
            .Select(g => new { Day = g.Key, Avg = g.Average(x => x.EngagementRate) })
            .OrderByDescending(x => x.Avg)
            .Select(x => x.Day)
            .FirstOrDefaultAsync();

        return Ok(new SocialMediaAnalyticsResponse(
            TopPlatformByEngagement: topPlatform,
            TopPostTypeByDonations: topPostType,
            AvgEngagementRateByPlatform: avgByPlatformItems,
            BestPostingHour: bestHour,
            BestDayOfWeek: bestDay
        ));
    }
}

