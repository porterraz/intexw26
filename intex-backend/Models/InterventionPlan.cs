using System.ComponentModel.DataAnnotations;

namespace Intex.Backend.Models;

public class InterventionPlan
{
    [Key]
    public int PlanId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    [Required]
    public string PlanCategory { get; set; } = "";

    [Required]
    public string PlanDescription { get; set; } = "";

    [Required]
    public string ServicesProvided { get; set; } = "";

    public double TargetValue { get; set; }
    public DateTime TargetDate { get; set; }

    [Required]
    public string Status { get; set; } = "";

    public DateTime CaseConferenceDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
