namespace Intex.Backend.Dtos;

public record RecentActivityItem(DateTime Timestamp, string Type, string Message);
public record MonthlyDonationPoint(string Month, decimal Amount);

public record DashboardSummaryResponse(
    int ActiveResidents,
    decimal DonationsThisMonth,
    int UpcomingCaseConferences,
    int AtRiskResidents,
    IReadOnlyList<RecentActivityItem> RecentActivity,
    IReadOnlyList<MonthlyDonationPoint> MonthlyDonations
);

// ── Rich analytics response for the overhauled admin dashboard ──

public record AdminAnalyticsResponse(
    int TotalResidents,
    int ActiveResidents,
    int AtRiskResidents,
    double ReintegrationRate,
    int TotalDonors,
    decimal TotalDonationsUsd,
    decimal DonationsThisMonth,
    IReadOnlyList<MonthlyDonationPoint> DonationTrend,
    IReadOnlyList<SocialMediaMonthPoint> SocialMediaTrend,
    IReadOnlyList<BreakdownItem> ReintegrationBreakdown,
    IReadOnlyList<BreakdownItem> RiskDistribution,
    IReadOnlyList<BreakdownItem> CaseCategoryBreakdown,
    IReadOnlyList<PlatformReachItem> PlatformReach,
    IReadOnlyList<RecentActivityItem> RecentActivity
);

public record SocialMediaMonthPoint(string Month, long Reach, double EngagementRate);
public record BreakdownItem(string Label, int Count);
public record PlatformReachItem(string Platform, long TotalReach, double AvgEngagementRate);
