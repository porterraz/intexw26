using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Intex.Backend.Models;

public class SocialMediaPost
{
    [Key]
    public int PostId { get; set; }

    [Required]
    public string Platform { get; set; } = "";

    public string? PlatformPostId { get; set; }
    public string? PostUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    [Required]
    public string DayOfWeek { get; set; } = "";

    public int PostHour { get; set; }

    [Required]
    public string PostType { get; set; } = "";

    [Required]
    public string MediaType { get; set; } = "";

    [Required]
    public string Caption { get; set; } = "";

    [Required]
    public string Hashtags { get; set; } = "";

    public int NumHashtags { get; set; }
    public int MentionsCount { get; set; }
    public bool HasCallToAction { get; set; }
    public string? CallToActionType { get; set; }

    [Required]
    public string ContentTopic { get; set; } = "";

    [Required]
    public string SentimentTone { get; set; } = "";

    public int CaptionLength { get; set; }
    public bool FeaturesResidentStory { get; set; }
    public string? CampaignName { get; set; }
    public bool IsBoosted { get; set; }

    [Precision(18, 2)]
    public decimal? BoostBudgetPhp { get; set; }

    public int Impressions { get; set; }
    public int Reach { get; set; }
    public int Likes { get; set; }
    public int Comments { get; set; }
    public int Shares { get; set; }
    public int Saves { get; set; }
    public int ClickThroughs { get; set; }
    public int? VideoViews { get; set; }

    [Precision(18, 4)]
    public decimal EngagementRate { get; set; }

    public int ProfileVisits { get; set; }
    public int DonationReferrals { get; set; }

    [Precision(18, 2)]
    public decimal EstimatedDonationValuePhp { get; set; }

    public int FollowerCountAtPost { get; set; }
    public double? WatchTimeSeconds { get; set; }
    public double? AvgViewDurationSeconds { get; set; }
    public int? SubscriberCountAtPost { get; set; }
    public int? Forwards { get; set; }
}

