using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/donations")]
[Authorize]
public class DonationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public DonationsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
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
    public async Task<ActionResult<IReadOnlyList<Donation>>> GetForSupporter(int supporterId)
    {
        var items = await _db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == supporterId)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        return Ok(items);
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
    public async Task<ActionResult> Delete(int id)
    {
        var existing = await _db.Donations.FirstOrDefaultAsync(d => d.DonationId == id);
        if (existing is null) return NotFound();

        _db.Donations.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

