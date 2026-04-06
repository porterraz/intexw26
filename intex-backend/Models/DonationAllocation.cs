using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Models;

public class DonationAllocation
{
    [Key]
    public int AllocationId { get; set; }

    public int DonationId { get; set; }
    public Donation? Donation { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    [Required]
    public string ProgramArea { get; set; } = "";

    [Precision(18, 2)]
    public decimal AmountAllocated { get; set; }

    public DateTime AllocationDate { get; set; }

    public string? AllocationNotes { get; set; }
}
