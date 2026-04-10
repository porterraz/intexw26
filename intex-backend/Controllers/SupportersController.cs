using System.Text.Json;
using Intex.Backend.Data;
using Intex.Backend.Dtos;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/supporters")]
[Authorize(Roles = "Admin")]
public class SupportersController : ControllerBase
{
    private const string DonorSegmentsFileName = "donor_segments.json";

    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<SupportersController> _logger;

    public SupportersController(ApplicationDbContext db, IWebHostEnvironment env, ILogger<SupportersController> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<Supporter>>> GetSupporters(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? supporterType = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null
    )
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 25 : pageSize;

        var q = _db.Supporters.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(supporterType))
            q = q.Where(s => s.SupporterType == supporterType);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(s => s.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(x =>
                x.DisplayName.Contains(s) ||
                x.Email.Contains(s) ||
                (x.OrganizationName != null && x.OrganizationName.Contains(s)));
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<Supporter>(items, page, pageSize, total));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Supporter>> GetSupporter(int id)
    {
        var supporter = await _db.Supporters.AsNoTracking()
            .Include(s => s.Donations.OrderByDescending(d => d.DonationDate))
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Supporter>> Create([FromBody] Supporter supporter)
    {
        supporter.SupporterId = 0;
        if (supporter.CreatedAt == default)
            supporter.CreatedAt = DateTime.UtcNow;

        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSupporter), new { id = supporter.SupporterId }, supporter);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Update(int id, [FromBody] Supporter updated)
    {
        var existing = await _db.Supporters.FirstOrDefaultAsync(s => s.SupporterId == id);
        if (existing is null) return NotFound();

        updated.SupporterId = id;
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

        var existing = await _db.Supporters.FirstOrDefaultAsync(s => s.SupporterId == id);
        if (existing is null) return NotFound();

        _db.Supporters.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("segments")]
    public ActionResult GetAllSegments()
    {
        var path = Path.Combine(_env.ContentRootPath, DonorSegmentsFileName);
        if (!System.IO.File.Exists(path))
            return Ok(new Dictionary<string, object>());

        try
        {
            var json = System.IO.File.ReadAllText(path);
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var segments = JsonSerializer.Deserialize<Dictionary<string, DonorSegmentEntry>>(json, opts);
            return Ok(segments ?? new Dictionary<string, DonorSegmentEntry>());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read {File}", DonorSegmentsFileName);
            return Ok(new Dictionary<string, object>());
        }
    }

    // GET: api/supporters/{id}/segment
    [HttpGet("{id:int}/segment")]
    public async Task<ActionResult> GetSegment(int id)
    {
        var supporter = await _db.Supporters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupporterId == id);
        if (supporter is null) return NotFound(new { message = "Supporter not found." });

        var path = Path.Combine(_env.ContentRootPath, DonorSegmentsFileName);
        if (!System.IO.File.Exists(path))
        {
            return Ok(new
            {
                supporterId = id,
                persona = (string?)null,
                message = $"Segment file '{DonorSegmentsFileName}' not found."
            });
        }

        try
        {
            var json = await System.IO.File.ReadAllTextAsync(path);
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var segments = JsonSerializer.Deserialize<Dictionary<string, DonorSegmentEntry>>(json, opts);

            if (segments is not null && segments.TryGetValue(id.ToString(), out var entry))
            {
                return Ok(new
                {
                    supporterId = id,
                    persona = entry.Persona,
                    recency = entry.Recency,
                    frequency = entry.Frequency,
                    monetary = entry.Monetary,
                    cluster = entry.Cluster
                });
            }

            return Ok(new
            {
                supporterId = id,
                persona = (string?)null,
                message = "No segment data for this supporter."
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read {File}", DonorSegmentsFileName);
            return Ok(new
            {
                supporterId = id,
                persona = (string?)null,
                message = $"Could not read '{DonorSegmentsFileName}'."
            });
        }
    }

    private sealed class DonorSegmentEntry
    {
        public string? Persona { get; set; }
        public int Recency { get; set; }
        public int Frequency { get; set; }
        public decimal Monetary { get; set; }
        public int Cluster { get; set; }
    }
}
