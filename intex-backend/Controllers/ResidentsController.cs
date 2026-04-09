using System.Text.Json;
using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Roles = "Admin")]
public class ResidentsController : ControllerBase
{
    private const string ResidentRecommendationsFileName = "resident_recommendations.json";

    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ResidentsController> _logger;

    public ResidentsController(
        ApplicationDbContext db,
        IWebHostEnvironment env,
        ILogger<ResidentsController> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<Resident>>> GetResidents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? caseStatus = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseCategory = null,
        [FromQuery] string? riskLevel = null,
        [FromQuery] string? assignedSocialWorker = null,
        [FromQuery] string? search = null
    )
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 25 : pageSize;

        var q = _db.Residents.AsNoTracking().Include(r => r.Safehouse).AsQueryable();

        if (!string.IsNullOrWhiteSpace(caseStatus))
        {
            var st = caseStatus.Trim();
            q = q.Where(r => r.CaseStatus == st);
        }

        if (safehouseId.HasValue)
            q = q.Where(r => r.SafehouseId == safehouseId.Value);

        if (!string.IsNullOrWhiteSpace(caseCategory))
        {
            var cat = caseCategory.Trim();
            q = q.Where(r => r.CaseCategory == cat);
        }

        if (!string.IsNullOrWhiteSpace(riskLevel))
            q = q.Where(r => r.CurrentRiskLevel == riskLevel);

        if (!string.IsNullOrWhiteSpace(assignedSocialWorker))
        {
            var sw = assignedSocialWorker.Trim();
            q = q.Where(r => r.AssignedSocialWorker == sw);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(r =>
                r.CaseControlNo.Contains(s) ||
                r.InternalCode.Contains(s));
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<Resident>(items, page, pageSize, total));
    }

    /// <summary>All distinct assigned social worker names (trimmed), from every resident record.</summary>
    [HttpGet("social-workers")]
    public async Task<ActionResult<List<string>>> GetDistinctSocialWorkers()
    {
        var raw = await _db.Residents.AsNoTracking()
            .Select(r => r.AssignedSocialWorker)
            .ToListAsync();

        var names = raw
            .Select(s => s?.Trim() ?? "")
            .Where(s => s.Length > 0)
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderBy(x => x, StringComparer.Ordinal).First())
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(names);
    }

    private async Task<List<string>> LoadDistinctCaseCategoriesAsync()
    {
        var raw = await _db.Residents.AsNoTracking()
            .Select(r => r.CaseCategory)
            .ToListAsync();

        return raw
            .Select(s => s?.Trim() ?? "")
            .Where(s => s.Length > 0)
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderBy(x => x, StringComparer.Ordinal).First())
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>All distinct case categories (trimmed), from every resident record.</summary>
    [HttpGet("case-categories")]
    public async Task<ActionResult<List<string>>> GetDistinctCaseCategories() =>
        Ok(await LoadDistinctCaseCategoriesAsync());

    /// <summary>Alias for clients/proxies where the longer route misbehaves.</summary>
    [HttpGet("categories")]
    public async Task<ActionResult<List<string>>> GetDistinctCaseCategoriesAlias() =>
        Ok(await LoadDistinctCaseCategoriesAsync());

    /// <summary>All distinct case statuses (trimmed), from every resident record.</summary>
    [HttpGet("case-statuses")]
    public async Task<ActionResult<List<string>>> GetDistinctCaseStatuses()
    {
        var raw = await _db.Residents.AsNoTracking()
            .Select(r => r.CaseStatus)
            .ToListAsync();

        var statuses = raw
            .Select(s => s?.Trim() ?? "")
            .Where(s => s.Length > 0)
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderBy(x => x, StringComparer.Ordinal).First())
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(statuses);
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

        var path = Path.Combine(_env.ContentRootPath, ResidentRecommendationsFileName);
        if (!System.IO.File.Exists(path))
        {
            return Ok(new
            {
                residentId = id,
                riskScore = (decimal?)null,
                message = $"Model output file '{ResidentRecommendationsFileName}' was not found.",
                modelUsed = ResidentRecommendationsFileName,
                peerMatches = Array.Empty<object>(),
                suggestedInterventions = Array.Empty<string>(),
            });
        }

        string json;
        try
        {
            json = await System.IO.File.ReadAllTextAsync(path);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read {File}", ResidentRecommendationsFileName);
            return Ok(new
            {
                residentId = id,
                riskScore = (decimal?)null,
                message = $"Could not read '{ResidentRecommendationsFileName}'.",
                modelUsed = ResidentRecommendationsFileName,
                peerMatches = Array.Empty<object>(),
                suggestedInterventions = Array.Empty<string>(),
            });
        }

        if (!TryParseRiskScores(json, out var scoresByResidentId, out var parseError))
        {
            return Ok(new
            {
                residentId = id,
                riskScore = (decimal?)null,
                message = parseError,
                modelUsed = ResidentRecommendationsFileName,
                peerMatches = Array.Empty<object>(),
                suggestedInterventions = Array.Empty<string>(),
            });
        }

        if (!scoresByResidentId.TryGetValue(id, out var riskScore))
        {
            return Ok(new
            {
                residentId = id,
                riskScore = (decimal?)null,
                message = "No risk score for this resident in the model output.",
                modelUsed = ResidentRecommendationsFileName,
                peerMatches = Array.Empty<object>(),
                suggestedInterventions = Array.Empty<string>(),
            });
        }

        return Ok(new
        {
            residentId = id,
            riskScore,
            message = (string?)null,
            modelUsed = ResidentRecommendationsFileName,
            peerMatches = Array.Empty<object>(),
            suggestedInterventions = Array.Empty<string>(),
        });
    }

    private static bool TryParseRiskScores(string json, out Dictionary<int, decimal> scores, out string? error)
    {
        scores = new Dictionary<int, decimal>();
        error = null;

        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        try
        {
            var asIntKeys = JsonSerializer.Deserialize<Dictionary<int, decimal>>(json, opts);
            if (asIntKeys is { Count: > 0 })
            {
                scores = asIntKeys;
                return true;
            }
        }
        catch (JsonException)
        {
            // try other shapes
        }

        try
        {
            var asStringKeys = JsonSerializer.Deserialize<Dictionary<string, decimal>>(json, opts);
            if (asStringKeys is { Count: > 0 })
            {
                foreach (var kv in asStringKeys)
                {
                    if (!int.TryParse(kv.Key, out var rid))
                    {
                        error = $"Invalid resident id key in JSON: '{kv.Key}'.";
                        scores.Clear();
                        return false;
                    }

                    scores[rid] = kv.Value;
                }

                return true;
            }
        }
        catch (JsonException)
        {
            // try array
        }

        try
        {
            var rows = JsonSerializer.Deserialize<List<RiskScoreJsonRow>>(json, opts);
            if (rows is { Count: > 0 })
            {
                foreach (var row in rows)
                {
                    scores[row.ResidentId] = row.RiskScore;
                }

                return true;
            }
        }
        catch (JsonException ex)
        {
            error = $"Could not parse '{ResidentRecommendationsFileName}': {ex.Message}";
            return false;
        }

        error = $"Could not parse '{ResidentRecommendationsFileName}' (expected object map of resident id → score or an array of rows).";
        return false;
    }

    private sealed class RiskScoreJsonRow
    {
        public int ResidentId { get; set; }
        public decimal RiskScore { get; set; }
    }
}
