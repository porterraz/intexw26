using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Roles = "Admin,Donor")]
public class ResidentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ResidentsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<Resident>>> GetResidents(
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

        var q = _db.Residents.AsNoTracking().Include(r => r.Safehouse).AsQueryable();

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
            .ToListAsync();

        return Ok(new PagedResult<Resident>(items, page, pageSize, total));
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
    // GET: api/residents/{id}/recommendations
    [HttpGet("{id:int}/recommendations")]
    public async Task<ActionResult> GetRecommendations(int id)
    {
        var resident = await _db.Residents
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ResidentId == id);
        if (resident is null)
        {
            return NotFound(new { message = "Resident not found." });
        }

        var peerCandidates = await _db.Residents
            .AsNoTracking()
            .Where(r => r.ResidentId != id)
            .Select(r => new
            {
                r.ResidentId,
                r.SafehouseId,
                r.CaseCategory,
                r.CurrentRiskLevel,
                r.InitialRiskLevel,
                r.CreatedAt,
            })
            .ToListAsync();

        var peerMatches = peerCandidates
            .Select(candidate =>
            {
                decimal score = 0m;
                var reasons = new List<string>();

                if (candidate.SafehouseId == resident.SafehouseId)
                {
                    score += 0.45m;
                    reasons.Add("Same safehouse");
                }

                if (string.Equals(candidate.CaseCategory, resident.CaseCategory, StringComparison.OrdinalIgnoreCase))
                {
                    score += 0.30m;
                    reasons.Add("Same case category");
                }

                if (string.Equals(candidate.CurrentRiskLevel, resident.CurrentRiskLevel, StringComparison.OrdinalIgnoreCase))
                {
                    score += 0.15m;
                    reasons.Add("Same current risk level");
                }

                if (string.Equals(candidate.InitialRiskLevel, resident.InitialRiskLevel, StringComparison.OrdinalIgnoreCase))
                {
                    score += 0.10m;
                    reasons.Add("Similar initial risk profile");
                }

                return new
                {
                    matchId = candidate.ResidentId,
                    similarityScore = Math.Round(score, 2),
                    matchReason = reasons.Count > 0 ? string.Join(", ", reasons) : "Closest profile from available records",
                    createdAt = candidate.CreatedAt,
                };
            })
            .Where(x => x.similarityScore > 0m)
            .OrderByDescending(x => x.similarityScore)
            .ThenByDescending(x => x.createdAt)
            .Take(5)
            .Select(x => new { x.matchId, x.similarityScore, x.matchReason })
            .ToList();

        var residentAndPeerIds = peerMatches
            .Select(x => x.matchId)
            .Append(id)
            .Distinct()
            .ToList();

        var suggestedInterventions = await _db.InterventionPlans
            .AsNoTracking()
            .Where(p => residentAndPeerIds.Contains(p.ResidentId))
            .GroupBy(p => p.PlanCategory)
            .Select(g => new
            {
                intervention = g.Key,
                usageCount = g.Count(),
            })
            .OrderByDescending(x => x.usageCount)
            .ThenBy(x => x.intervention)
            .Take(5)
            .Select(x => x.intervention)
            .ToListAsync();

        return Ok(new
        {
            residentId = id,
            modelUsed = "Database similarity scoring (safehouse, case category, risk profile)",
            peerMatches,
            suggestedInterventions,
        });
    }
}
