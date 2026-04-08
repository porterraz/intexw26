using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/donations")]
[Authorize]
public class DonationsController : ControllerBase
{
    public record DonorDonationRequest(decimal Amount, string? CampaignName, string? Notes, bool IsRecurring = false);

    private readonly ApplicationDbContext _db;

    public DonationsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResult<Donation>>> GetDonations(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25
    )
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 25 : pageSize;

        var q = _db.Donations.AsNoTracking()
            .OrderByDescending(d => d.DonationDate);

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PagedResult<Donation>(items, page, pageSize, total));
    }

    [HttpGet("supporter/{supporterId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<Donation>>> GetForSupporter(int supporterId)
    {
        var items = await _db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == supporterId)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<Donation>>> GetMyDonations()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Could not resolve current user email." });
        }

        var supporterId = await _db.Supporters.AsNoTracking()
            .Where(s => s.Email == email)
            .Select(s => (int?)s.SupporterId)
            .FirstOrDefaultAsync();

        if (!supporterId.HasValue)
        {
            return Ok(Array.Empty<Donation>());
        }

        var items = await _db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == supporterId.Value)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("me")]
    [Authorize(Roles = "Donor")]
    public async Task<ActionResult<Donation>> CreateMyDonation([FromBody] DonorDonationRequest req)
    {
        if (req.Amount <= 0m)
        {
            return BadRequest(new { message = "Donation amount must be greater than zero." });
        }

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Could not resolve current user email." });
        }

        var supporter = await _db.Supporters.FirstOrDefaultAsync(s => s.Email == email);
        if (supporter is null)
        {
            supporter = new Supporter
            {
                SupporterType = "MonetaryDonor",
                DisplayName = email.Split('@')[0],
                RelationshipType = "Local",
                Region = "Unknown",
                Country = "Unknown",
                Email = email,
                Phone = "N/A",
                Status = "Active",
                AcquisitionChannel = "Website",
                CreatedAt = DateTime.UtcNow,
                FirstDonationDate = DateTime.UtcNow.Date
            };
            _db.Supporters.Add(supporter);
            await _db.SaveChangesAsync();
        }

        var donation = new Donation
        {
            SupporterId = supporter.SupporterId,
            DonationType = "Monetary",
            DonationDate = DateTime.UtcNow,
            ChannelSource = "Website",
            CurrencyCode = "USD",
            Amount = req.Amount,
            EstimatedValue = req.Amount,
            ImpactUnit = "USD",
            IsRecurring = req.IsRecurring,
            CampaignName = string.IsNullOrWhiteSpace(req.CampaignName) ? null : req.CampaignName.Trim(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? "Donor dashboard self-service donation." : req.Notes.Trim()
        };

        if (!supporter.FirstDonationDate.HasValue)
        {
            supporter.FirstDonationDate = donation.DonationDate;
        }

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyDonations), new { }, donation);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Donation>> Create([FromBody] Donation donation)
    {
        donation.DonationId = 0;
        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetForSupporter), new { supporterId = donation.SupporterId }, donation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Update(int id, [FromBody] Donation updated)
    {
        var existing = await _db.Donations.FirstOrDefaultAsync(d => d.DonationId == id);
        if (existing is null) return NotFound();

        updated.DonationId = id;
        _db.Entry(existing).CurrentValues.SetValues(updated);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Confirmation required. Pass ?confirm=true." });
        }

        var existing = await _db.Donations.FirstOrDefaultAsync(d => d.DonationId == id);
        if (existing is null) return NotFound();

        _db.Donations.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
