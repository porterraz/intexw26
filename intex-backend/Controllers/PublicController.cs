using Intex.Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    /// <summary>Approximate PHP→USD for public totals (dataset monetary rows use PHP).</summary>
    private const decimal PhpToUsdRate = 0.0175m;

    private readonly ApplicationDbContext _db;

    public PublicController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("impact")]
    public async Task<ActionResult> GetImpact()
    {
        var snapshot = await _db.PublicImpactSnapshots.AsNoTracking()
            .Where(s => s.IsPublished)
            .OrderByDescending(s => s.PublishedAt ?? s.SnapshotDate)
            .FirstOrDefaultAsync();

        return snapshot is null ? NotFound() : Ok(snapshot);
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var totalGirlsServed = await _db.Residents.AsNoTracking().CountAsync();

        var activeSafehouses = await _db.Safehouses.AsNoTracking()
            .CountAsync(s => s.Status == "Open" || s.Status == "Active");

        var totalClosed = await _db.Residents.AsNoTracking().CountAsync(r => r.DateClosed != null || r.CaseStatus == "Closed");
        var reintegrated = await _db.Residents.AsNoTracking()
            .CountAsync(r => r.ReintegrationStatus == "Reintegrated");

        var reintegrationRate = totalClosed == 0 ? 0 : (double)reintegrated / totalClosed;

        var totalDonors = await _db.Supporters.AsNoTracking().CountAsync();

        // Monetary rows: case-insensitive type; Amount ?? EstimatedValue (imports sometimes leave Amount null).
        var totalDonationsUsd = await _db.Donations.AsNoTracking()
            .Where(d => d.DonationType.ToLower() == "monetary")
            .SumAsync(d =>
                (d.CurrencyCode == "USD" ? 1m : PhpToUsdRate) * (d.Amount ?? d.EstimatedValue ?? 0m));

        return Ok(new
        {
            totalGirlsServed,
            activeSafehouses,
            reintegrationRate,
            totalDonors,
            totalDonationsUsd
        });
    }
}

