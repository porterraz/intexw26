using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin,Donor")]
public class DashboardController : ControllerBase
{
    private const decimal PhpToUsdRate = 0.0175m;

    private readonly ApplicationDbContext _db;

    public DashboardController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Legacy lightweight summary (kept for backward compat).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> Summary()
    {
        var activeResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.DateClosed == null && r.CaseStatus != "Closed");

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var donationsThisMonth = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= startOfMonth)
            .Select(d => d.Amount ?? d.EstimatedValue ?? 0m)
            .SumAsync();

        var conferenceWindowEnd = now.Date.AddDays(30);
        var upcomingCaseConferences = await _db.HomeVisitations.AsNoTracking()
            .CountAsync(v =>
                v.VisitDate.Date >= now.Date &&
                v.VisitDate.Date <= conferenceWindowEnd &&
                (EF.Functions.Like(v.VisitType, "%Conference%")
                 || EF.Functions.Like(v.Purpose, "%Conference%")
                 || EF.Functions.Like(v.Observations, "%Conference%")));

        var atRiskResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical");

        var recent = await BuildRecentActivity();
        var monthlyDonations = await BuildMonthlyDonations(now, 6);

        return Ok(new DashboardSummaryResponse(
            ActiveResidents: activeResidents,
            DonationsThisMonth: donationsThisMonth,
            UpcomingCaseConferences: upcomingCaseConferences,
            AtRiskResidents: atRiskResidents,
            RecentActivity: recent,
            MonthlyDonations: monthlyDonations
        ));
    }

    /// <summary>Rich analytics payload for the overhauled admin dashboard.</summary>
    [HttpGet("analytics")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AdminAnalyticsResponse>> Analytics()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        // ── Resident KPIs ──
        var totalResidents = await _db.Residents.AsNoTracking().CountAsync();
        var activeResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.DateClosed == null && r.CaseStatus != "Closed");
        var atRiskResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical");

        // ── Reintegration rate ──
        var totalClosed = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.DateClosed != null || r.CaseStatus == "Closed");
        var reintegrated = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.ReintegrationStatus == "Completed");
        var reintegrationRate = totalClosed == 0 ? 0 : (double)reintegrated / totalClosed;

        // ── Donor / donation KPIs ──
        var totalDonors = await _db.Supporters.AsNoTracking().CountAsync();
        var totalDonationsUsd = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationType.ToLower() == "monetary")
            .SumAsync(d =>
                (d.CurrencyCode == "USD" ? 1m : PhpToUsdRate) * (d.Amount ?? d.EstimatedValue ?? 0m));
        var donationsThisMonth = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= startOfMonth)
            .Select(d => d.Amount ?? d.EstimatedValue ?? 0m)
            .SumAsync();

        // ── Donation trend (12 months) ──
        var donationTrend = await BuildMonthlyDonations(now, 12);

        // ── Social media reach trend (12 months) ──
        var socialMediaTrend = await BuildSocialMediaTrend(now);

        // ── Reintegration breakdown ──
        var reintegrationRows = await _db.Residents.AsNoTracking()
            .Where(r => r.ReintegrationStatus != null && r.ReintegrationStatus != "")
            .GroupBy(r => r.ReintegrationStatus!)
            .Select(g => new BreakdownItem(g.Key, g.Count()))
            .ToListAsync();

        // ── Risk level distribution (active only) ──
        var riskRows = await _db.Residents.AsNoTracking()
            .Where(r => r.DateClosed == null && r.CaseStatus != "Closed")
            .GroupBy(r => r.CurrentRiskLevel)
            .Select(g => new BreakdownItem(g.Key, g.Count()))
            .ToListAsync();

        // ── Case category breakdown (boolean sub-category flags) ──
        var catFlags = await _db.Residents.AsNoTracking().Select(r => new CatFlags(
            r.SubCatTrafficked, r.SubCatPhysicalAbuse, r.SubCatSexualAbuse,
            r.SubCatOsaec, r.SubCatChildLabor, r.SubCatOrphaned,
            r.SubCatCicl, r.SubCatAtRisk, r.SubCatStreetChild, r.SubCatChildWithHiv
        )).ToListAsync();
        var catBreakdown = BuildCaseCategoryBreakdown(catFlags);

        // ── Platform reach ──
        var platformReach = await _db.SocialMediaPosts.AsNoTracking()
            .GroupBy(p => p.Platform)
            .Select(g => new PlatformReachItem(
                g.Key,
                g.Sum(p => (long)p.Reach),
                (double)g.Average(p => p.EngagementRate)))
            .ToListAsync();

        // ── Recent activity (last 8) ──
        var recent = await BuildRecentActivity();

        return Ok(new AdminAnalyticsResponse(
            TotalResidents: totalResidents,
            ActiveResidents: activeResidents,
            AtRiskResidents: atRiskResidents,
            ReintegrationRate: reintegrationRate,
            TotalDonors: totalDonors,
            TotalDonationsUsd: totalDonationsUsd,
            DonationsThisMonth: donationsThisMonth,
            DonationTrend: donationTrend,
            SocialMediaTrend: socialMediaTrend,
            ReintegrationBreakdown: reintegrationRows,
            RiskDistribution: riskRows,
            CaseCategoryBreakdown: catBreakdown,
            PlatformReach: platformReach,
            RecentActivity: recent
        ));
    }

    // ────────────────────────── helpers ──────────────────────────

    private async Task<IReadOnlyList<MonthlyDonationPoint>> BuildMonthlyDonations(DateTime nowUtc, int months)
    {
        var firstMonth = new DateTime(nowUtc.Year, nowUtc.Month, 1).AddMonths(-(months - 1));
        var rows = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= firstMonth)
            .Select(d => new { d.DonationDate.Year, d.DonationDate.Month, Amount = d.Amount ?? d.EstimatedValue ?? 0m })
            .ToListAsync();

        var grouped = rows
            .GroupBy(x => new { x.Year, x.Month })
            .ToDictionary(g => (g.Key.Year, g.Key.Month), g => g.Sum(x => x.Amount));

        var points = new List<MonthlyDonationPoint>(months);
        for (var i = 0; i < months; i++)
        {
            var dt = firstMonth.AddMonths(i);
            grouped.TryGetValue((dt.Year, dt.Month), out var amount);
            points.Add(new MonthlyDonationPoint(dt.ToString("MMM yyyy"), amount));
        }
        return points;
    }

    private async Task<IReadOnlyList<SocialMediaMonthPoint>> BuildSocialMediaTrend(DateTime nowUtc)
    {
        var firstMonth = new DateTime(nowUtc.Year, nowUtc.Month, 1).AddMonths(-11);
        var rows = await _db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.CreatedAt >= firstMonth)
            .Select(p => new { p.CreatedAt.Year, p.CreatedAt.Month, p.Reach, EngagementRate = (double)p.EngagementRate })
            .ToListAsync();

        var grouped = rows
            .GroupBy(x => new { x.Year, x.Month })
            .ToDictionary(
                g => (g.Key.Year, g.Key.Month),
                g => (Reach: g.Sum(x => (long)x.Reach), AvgEng: g.Average(x => x.EngagementRate)));

        var points = new List<SocialMediaMonthPoint>(12);
        for (var i = 0; i < 12; i++)
        {
            var dt = firstMonth.AddMonths(i);
            grouped.TryGetValue((dt.Year, dt.Month), out var val);
            points.Add(new SocialMediaMonthPoint(dt.ToString("MMM yyyy"), val.Reach, Math.Round(val.AvgEng, 2)));
        }
        return points;
    }

    private record CatFlags(
        bool Trafficked, bool PhysicalAbuse, bool SexualAbuse,
        bool Osaec, bool ChildLabor, bool Orphaned,
        bool Cicl, bool AtRisk, bool StreetChild, bool ChildWithHiv);

    private static IReadOnlyList<BreakdownItem> BuildCaseCategoryBreakdown(IReadOnlyList<CatFlags> residents)
    {
        var map = new Dictionary<string, int>
        {
            ["Trafficked"] = 0, ["Physical Abuse"] = 0, ["Sexual Abuse"] = 0,
            ["OSAEC"] = 0, ["Child Labor"] = 0, ["Orphaned"] = 0,
            ["CICL"] = 0, ["At Risk"] = 0, ["Street Child"] = 0, ["Child with HIV"] = 0
        };

        foreach (var r in residents)
        {
            if (r.Trafficked) map["Trafficked"]++;
            if (r.PhysicalAbuse) map["Physical Abuse"]++;
            if (r.SexualAbuse) map["Sexual Abuse"]++;
            if (r.Osaec) map["OSAEC"]++;
            if (r.ChildLabor) map["Child Labor"]++;
            if (r.Orphaned) map["Orphaned"]++;
            if (r.Cicl) map["CICL"]++;
            if (r.AtRisk) map["At Risk"]++;
            if (r.StreetChild) map["Street Child"]++;
            if (r.ChildWithHiv) map["Child with HIV"]++;
        }

        return map.Where(kv => kv.Value > 0)
            .OrderByDescending(kv => kv.Value)
            .Select(kv => new BreakdownItem(kv.Key, kv.Value))
            .ToList();
    }

    private async Task<IReadOnlyList<RecentActivityItem>> BuildRecentActivity()
    {
        var residentEvents = await _db.Residents.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Take(5)
            .Select(r => new RecentActivityItem(
                r.CreatedAt == default ? DateTime.UtcNow : r.CreatedAt,
                "Resident",
                $"Resident case created: {r.CaseControlNo}"))
            .ToListAsync();

        var donationEvents = await _db.Donations.AsNoTracking()
            .OrderByDescending(d => d.DonationDate)
            .Take(5)
            .Select(d => new RecentActivityItem(
                d.DonationDate,
                "Donation",
                $"Donation recorded (SupporterId {d.SupporterId})"))
            .ToListAsync();

        var sessionEvents = await _db.ProcessRecordings.AsNoTracking()
            .OrderByDescending(p => p.SessionDate)
            .Take(5)
            .Select(p => new RecentActivityItem(
                p.SessionDate,
                "ProcessRecording",
                $"Session recorded (ResidentId {p.ResidentId})"))
            .ToListAsync();

        var visitEvents = await _db.HomeVisitations.AsNoTracking()
            .OrderByDescending(v => v.VisitDate)
            .Take(5)
            .Select(v => new RecentActivityItem(
                v.VisitDate,
                "HomeVisitation",
                $"Home visit recorded (ResidentId {v.ResidentId})"))
            .ToListAsync();

        return residentEvents
            .Concat(donationEvents)
            .Concat(sessionEvents)
            .Concat(visitEvents)
            .OrderByDescending(e => e.Timestamp)
            .Take(8)
            .ToList();
    }
}
