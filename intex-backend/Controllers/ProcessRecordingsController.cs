using Intex.Backend.Data;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize(Roles = "Admin")]
public class ProcessRecordingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ProcessRecordingsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("resident/{residentId:int}")]
    public async Task<ActionResult<IReadOnlyList<ProcessRecording>>> GetForResident(int residentId)
    {
        var items = await _db.ProcessRecordings.AsNoTracking()
            .Where(r => r.ResidentId == residentId)
            .OrderByDescending(r => r.SessionDate)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProcessRecording>> Create([FromBody] ProcessRecording recording)
    {
        recording.RecordingId = 0;
        _db.ProcessRecordings.Add(recording);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetForResident), new { residentId = recording.ResidentId }, recording);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Update(int id, [FromBody] ProcessRecording updated)
    {
        var existing = await _db.ProcessRecordings.FirstOrDefaultAsync(r => r.RecordingId == id);
        if (existing is null) return NotFound();

        updated.RecordingId = id;
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

        var existing = await _db.ProcessRecordings.FirstOrDefaultAsync(r => r.RecordingId == id);
        if (existing is null) return NotFound();

        _db.ProcessRecordings.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
