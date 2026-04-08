using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin")]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public DashboardController(ApplicationDbContext db)
    {
        _db = db;
    }

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
        var monthlyDonations = await BuildMonthlyDonations(now);

        var response = new DashboardSummaryResponse(
            ActiveResidents: activeResidents,
            DonationsThisMonth: donationsThisMonth,
            UpcomingCaseConferences: upcomingCaseConferences,
            AtRiskResidents: atRiskResidents,
            RecentActivity: recent,
            MonthlyDonations: monthlyDonations
        );

        return Ok(response);
    }

    private async Task<IReadOnlyList<MonthlyDonationPoint>> BuildMonthlyDonations(DateTime nowUtc)
    {
        var firstMonth = new DateTime(nowUtc.Year, nowUtc.Month, 1).AddMonths(-5);
        var rows = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= firstMonth)
            .Select(d => new
            {
                Year = d.DonationDate.Year,
                Month = d.DonationDate.Month,
                Amount = d.Amount ?? d.EstimatedValue ?? 0m
            })
            .ToListAsync();

        var grouped = rows
            .GroupBy(x => new { x.Year, x.Month })
            .ToDictionary(
                g => (g.Key.Year, g.Key.Month),
                g => g.Sum(x => x.Amount)
            );

        var points = new List<MonthlyDonationPoint>(6);
        for (var i = 0; i < 6; i++)
        {
            var dt = firstMonth.AddMonths(i);
            grouped.TryGetValue((dt.Year, dt.Month), out var amount);
            points.Add(new MonthlyDonationPoint(dt.ToString("MMM yyyy"), amount));
        }

        return points;
    }

    private async Task<IReadOnlyList<RecentActivityItem>> BuildRecentActivity()
    {
        var residentEvents = await _db.Residents.AsNoTracking()
            .Select(r => new RecentActivityItem(
                r.CreatedAt == default ? DateTime.UtcNow : r.CreatedAt,
                "Resident",
                $"Resident case created: {r.CaseControlNo}"
            ))
            .ToListAsync();

        var donationEvents = await _db.Donations.AsNoTracking()
            .Select(d => new RecentActivityItem(
                d.DonationDate,
                "Donation",
                $"Donation recorded (SupporterId {d.SupporterId})"
            ))
            .ToListAsync();

        var sessionEvents = await _db.ProcessRecordings.AsNoTracking()
            .Select(p => new RecentActivityItem(
                p.SessionDate,
                "ProcessRecording",
                $"Session recorded (ResidentId {p.ResidentId})"
            ))
            .ToListAsync();

        var visitEvents = await _db.HomeVisitations.AsNoTracking()
            .Select(v => new RecentActivityItem(
                v.VisitDate,
                "HomeVisitation",
                $"Home visit recorded (ResidentId {v.ResidentId})"
            ))
            .ToListAsync();

        return residentEvents
            .Concat(donationEvents)
            .Concat(sessionEvents)
            .Concat(visitEvents)
            .OrderByDescending(e => e.Timestamp)
            .Take(10)
            .ToList();
    }
}
