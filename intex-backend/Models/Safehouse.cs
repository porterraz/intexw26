using System.ComponentModel.DataAnnotations;

namespace Intex.Backend.Models;

public class Safehouse
{
    [Key]
    public int SafehouseId { get; set; }

    [Required]
    public string SafehouseCode { get; set; } = "";

    [Required]
    public string Name { get; set; } = "";

    [Required]
    public string Region { get; set; } = "";

    [Required]
    public string City { get; set; } = "";

    [Required]
    public string Province { get; set; } = "";

    [Required]
    public string Country { get; set; } = "";

    public DateTime OpenDate { get; set; }

    [Required]
    public string Status { get; set; } = "";

    public int CapacityGirls { get; set; }
    public int CapacityStaff { get; set; }
    public int CurrentOccupancy { get; set; }

    [Required]
    public string Notes { get; set; } = "";

    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = new List<DonationAllocation>();
    public ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();
    public ICollection<SafehouseMonthlyMetric> SafehouseMonthlyMetrics { get; set; } = new List<SafehouseMonthlyMetric>();
    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = new List<PartnerAssignment>();
}

