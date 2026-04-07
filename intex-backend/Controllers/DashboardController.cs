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

        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var donationsThisMonth = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationDate >= startOfMonth)
            .Select(d => d.Amount ?? d.EstimatedValue ?? 0m)
            .SumAsync();

        var atRiskResidents = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical");

        var recent = await BuildRecentActivity();

        var response = new DashboardSummaryResponse(
            ActiveResidents: activeResidents,
            DonationsThisMonth: donationsThisMonth,
            UpcomingCaseConferences: 0,
            AtRiskResidents: atRiskResidents,
            RecentActivity: recent
        );

        return Ok(response);
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

