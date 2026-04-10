namespace Intex.Backend.Dtos;

public record LabelDecimalSeries(IReadOnlyList<string> Labels, IReadOnlyList<decimal> Values);

public record LabelIntSeries(IReadOnlyList<string> Labels, IReadOnlyList<int> Values);

public record SocialMediaMlDashboardMeta(int NPosts, double WeeklyMean, double WeeklyMedian, double WeeklyStd);

public record SocialMediaPostPlatformCombo(string Label, decimal AvgReferrals);

public record MlInsights(
    string? BestPlatform,
    decimal? BestPlatformAvg,
    string? BestPostType,
    int? BestHour,
    string? BestDay,
    string? BestTopic,
    decimal? CtaLiftPct,
    decimal? StoryLiftPct
);

public record SocialMediaMlDashboardResponse(
    SocialMediaMlDashboardMeta Meta,
    LabelDecimalSeries PlatformAvgReferrals,
    LabelDecimalSeries PlatformDonationSignalRate,
    LabelDecimalSeries PostTypeAvgReferrals,
    LabelDecimalSeries PostTypeAvgEngagement,
    LabelDecimalSeries HourAvgReferrals,
    LabelDecimalSeries DayOfWeekAvgReferrals,
    LabelIntSeries Cadence,
    IReadOnlyList<SocialMediaPostPlatformCombo> TopPostTypePlatformCombos,
    MlInsights? Insights = null
);
