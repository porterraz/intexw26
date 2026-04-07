using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize]
public class ResidentsController : ControllerBase
{
    public sealed class ResidentListItemDto
    {
        public int ResidentId { get; set; }
        public string CaseControlNo { get; set; } = "";
        public string InternalCode { get; set; } = "";
        public int SafehouseId { get; set; }
        public string CaseCategory { get; set; } = "";
        public string CurrentRiskLevel { get; set; } = "";
        public string CaseStatus { get; set; } = "";
        public string AssignedSocialWorker { get; set; } = "";
        public SafehouseNameDto? Safehouse { get; set; }
    }

    public sealed class SafehouseNameDto
    {
        public string Name { get; set; } = "";
    }

    private readonly ApplicationDbContext _db;

    public ResidentsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ResidentListItemDto>>> GetResidents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? caseStatus = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseCategory = null,
        [FromQuery] string? riskLevel = null,
        [FromQuery] string? search = null
    )
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 25 : pageSize;

        var q = _db.Residents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(caseStatus))
            q = q.Where(r => r.CaseStatus == caseStatus);

        if (safehouseId.HasValue)
            q = q.Where(r => r.SafehouseId == safehouseId.Value);

        if (!string.IsNullOrWhiteSpace(caseCategory))
            q = q.Where(r => r.CaseCategory == caseCategory);

        if (!string.IsNullOrWhiteSpace(riskLevel))
            q = q.Where(r => r.CurrentRiskLevel == riskLevel);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(r =>
                r.CaseControlNo.Contains(s) ||
                r.InternalCode.Contains(s) ||
                r.AssignedSocialWorker.Contains(s));
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ResidentListItemDto
            {
                ResidentId = r.ResidentId,
                CaseControlNo = r.CaseControlNo,
                InternalCode = r.InternalCode,
                SafehouseId = r.SafehouseId,
                CaseCategory = r.CaseCategory,
                CurrentRiskLevel = r.CurrentRiskLevel,
                CaseStatus = r.CaseStatus,
                AssignedSocialWorker = r.AssignedSocialWorker,
                Safehouse = r.Safehouse == null
                    ? null
                    : new SafehouseNameDto { Name = r.Safehouse.Name }
            })
            .ToListAsync();

        return Ok(new PagedResult<ResidentListItemDto>(items, page, pageSize, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Resident>> GetResident(int id)
    {
        var resident = await _db.Residents.AsNoTracking()
            .Include(r => r.Safehouse)
            .Include(r => r.ProcessRecordings)
            .Include(r => r.HomeVisitations)
            .FirstOrDefaultAsync(r => r.ResidentId == id);

        return resident is null ? NotFound() : Ok(resident);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Resident>> CreateResident([FromBody] Resident resident)
    {
        resident.ResidentId = 0;
        if (resident.CreatedAt == default)
            resident.CreatedAt = DateTime.UtcNow;

        _db.Residents.Add(resident);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetResident), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateResident(int id, [FromBody] Resident updated)
    {
        if (id != updated.ResidentId && updated.ResidentId != 0)
        {
            return BadRequest(new { message = "ResidentId mismatch." });
        }

        var existing = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == id);
        if (existing is null) return NotFound();

        updated.ResidentId = id;
        _db.Entry(existing).CurrentValues.SetValues(updated);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteResident(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { message = "Confirmation required. Pass ?confirm=true." });
        }

        var resident = await _db.Residents.FirstOrDefaultAsync(r => r.ResidentId == id);
        if (resident is null) return NotFound();

        _db.Residents.Remove(resident);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

