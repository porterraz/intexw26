using System.ComponentModel.DataAnnotations;

namespace Intex.Backend.Models;

public class Partner
{
    [Key]
    public int PartnerId { get; set; }

    [Required]
    public string PartnerName { get; set; } = "";

    [Required]
    public string PartnerType { get; set; } = "";

    [Required]
    public string RoleType { get; set; } = "";

    [Required]
    public string ContactName { get; set; } = "";

    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    public string Phone { get; set; } = "";

    [Required]
    public string Region { get; set; } = "";

    [Required]
    public string Status { get; set; } = "";

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public string? Notes { get; set; }

    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = new List<PartnerAssignment>();
}
