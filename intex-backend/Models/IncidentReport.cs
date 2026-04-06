using System.ComponentModel.DataAnnotations;

namespace Intex.Backend.Models;

public class IncidentReport
{
    [Key]
    public int IncidentId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public int SafehouseId { get; set; }
    public Safehouse? Safehouse { get; set; }

    public DateTime IncidentDate { get; set; }

    [Required]
    public string IncidentType { get; set; } = "";

    [Required]
    public string Severity { get; set; } = "";

    [Required]
    public string Description { get; set; } = "";

    [Required]
    public string ResponseTaken { get; set; } = "";

    public bool Resolved { get; set; }
    public DateTime? ResolutionDate { get; set; }

    [Required]
    public string ReportedBy { get; set; } = "";

    public bool FollowUpRequired { get; set; }
}
