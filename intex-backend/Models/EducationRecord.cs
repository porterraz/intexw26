using System.ComponentModel.DataAnnotations;

namespace Intex.Backend.Models;

public class EducationRecord
{
    [Key]
    public int EducationRecordId { get; set; }

    public int ResidentId { get; set; }
    public Resident? Resident { get; set; }

    public DateTime RecordDate { get; set; }

    [Required]
    public string EducationLevel { get; set; } = "";

    [Required]
    public string SchoolName { get; set; } = "";

    [Required]
    public string EnrollmentStatus { get; set; } = "";

    public double AttendanceRate { get; set; }
    public double ProgressPercent { get; set; }

    [Required]
    public string CompletionStatus { get; set; } = "";

    public string? Notes { get; set; }
}
