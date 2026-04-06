using Intex.Backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Resident>()
            .HasOne(r => r.Safehouse)
            .WithMany(s => s.Residents)
            .HasForeignKey(r => r.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Donation>()
            .HasOne(d => d.Supporter)
            .WithMany(s => s.Donations)
            .HasForeignKey(d => d.SupporterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Donation>()
            .HasOne(d => d.ReferralPost)
            .WithMany()
            .HasForeignKey(d => d.ReferralPostId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<DonationAllocation>()
            .HasOne(da => da.Donation)
            .WithMany(d => d.DonationAllocations)
            .HasForeignKey(da => da.DonationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DonationAllocation>()
            .HasOne(da => da.Safehouse)
            .WithMany(s => s.DonationAllocations)
            .HasForeignKey(da => da.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<InKindDonationItem>()
            .HasOne(i => i.Donation)
            .WithMany(d => d.InKindDonationItems)
            .HasForeignKey(i => i.DonationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EducationRecord>()
            .HasOne(e => e.Resident)
            .WithMany(r => r.EducationRecords)
            .HasForeignKey(e => e.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HealthWellbeingRecord>()
            .HasOne(h => h.Resident)
            .WithMany(r => r.HealthWellbeingRecords)
            .HasForeignKey(h => h.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ProcessRecording>()
            .HasOne(p => p.Resident)
            .WithMany(r => r.ProcessRecordings)
            .HasForeignKey(p => p.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HomeVisitation>()
            .HasOne(v => v.Resident)
            .WithMany(r => r.HomeVisitations)
            .HasForeignKey(v => v.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<IncidentReport>()
            .HasOne(i => i.Resident)
            .WithMany(r => r.IncidentReports)
            .HasForeignKey(i => i.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<IncidentReport>()
            .HasOne(i => i.Safehouse)
            .WithMany(s => s.IncidentReports)
            .HasForeignKey(i => i.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<InterventionPlan>()
            .HasOne(ip => ip.Resident)
            .WithMany(r => r.InterventionPlans)
            .HasForeignKey(ip => ip.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PartnerAssignment>()
            .HasOne(pa => pa.Partner)
            .WithMany(p => p.PartnerAssignments)
            .HasForeignKey(pa => pa.PartnerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PartnerAssignment>()
            .HasOne(pa => pa.Safehouse)
            .WithMany(s => s.PartnerAssignments)
            .HasForeignKey(pa => pa.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<SafehouseMonthlyMetric>()
            .HasOne(m => m.Safehouse)
            .WithMany(s => s.SafehouseMonthlyMetrics)
            .HasForeignKey(m => m.SafehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
