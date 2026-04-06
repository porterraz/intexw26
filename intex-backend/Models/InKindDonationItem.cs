using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Models;

public class InKindDonationItem
{
    [Key]
    public int ItemId { get; set; }

    public int DonationId { get; set; }
    public Donation? Donation { get; set; }

    [Required]
    public string ItemName { get; set; } = "";

    [Required]
    public string ItemCategory { get; set; } = "";

    public int Quantity { get; set; }

    [Required]
    public string UnitOfMeasure { get; set; } = "";

    [Precision(18, 2)]
    public decimal EstimatedUnitValue { get; set; }

    [Required]
    public string IntendedUse { get; set; } = "";

    [Required]
    public string ReceivedCondition { get; set; } = "";
}
