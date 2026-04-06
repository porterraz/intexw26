using System.ComponentModel.DataAnnotations;

namespace Intex.Backend.Models;

public class PartnerAssignment
{
    [Key]
    public int AssignmentId { get; set; }

    public int PartnerId { get; set; }
    public Partner? Partner { get; set; }

    public int? SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    [Required]
    public string ProgramArea { get; set; } = "";

    public DateTime AssignmentStart { get; set; }
    public DateTime? AssignmentEnd { get; set; }

    public string? ResponsibilityNotes { get; set; }

    public bool IsPrimary { get; set; }

    [Required]
    public string Status { get; set; } = "";
}
