using Intex.Backend.Data;
using Intex.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Controllers;

[ApiController]
[Route("api/safehouses")]
[Authorize(Roles = "Admin")]
public class SafehousesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SafehousesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Safehouse>>> GetAll()
    {
        var safehouses = await _db.Safehouses.AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(safehouses);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Safehouse>> Get(int id)
    {
        var safehouse = await _db.Safehouses.AsNoTracking()
            .Include(s => s.Residents)
            .FirstOrDefaultAsync(s => s.SafehouseId == id);

        return safehouse is null ? NotFound() : Ok(safehouse);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Safehouse>> Create([FromBody] Safehouse safehouse)
    {
        safehouse.SafehouseId = 0;
        _db.Safehouses.Add(safehouse);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = safehouse.SafehouseId }, safehouse);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Update(int id, [FromBody] Safehouse updated)
    {
        var existing = await _db.Safehouses.FirstOrDefaultAsync(s => s.SafehouseId == id);
        if (existing is null) return NotFound();

        updated.SafehouseId = id;
        _db.Entry(existing).CurrentValues.SetValues(updated);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
