"""
Generate synthetic donors (Supporters + Donations) with realistic causal
patterns baked in, so the donor-churn-classifier and donor-segmentation
notebooks can find statistically significant effects.

Causal structure embedded:
  - is_recurring  →  strong negative effect on churn (~5% vs ~28%)
  - days_since_last_donation  →  strong positive effect on churn
  - acquisition_channel  →  moderate effect (SocialMedia highest, Church lowest)
  - total_value  →  moderate negative effect on churn
  - num_donation_types  →  weak negative effect on churn

Run once:  python generate_synthetic_donors.py
"""

import os, sys, random, math
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from faker import Faker

# ── reuse the project's DB connection ──
sys.path.insert(0, os.path.dirname(__file__))
from db_loader import _get_engine

fake = Faker()
Faker.seed(42)
np.random.seed(42)
random.seed(42)

N_NEW_SUPPORTERS = 500

# ── value pools (match existing data) ──
SUPPORTER_TYPES = [
    ("MonetaryDonor", 0.39),
    ("InKindDonor", 0.21),
    ("SocialMediaAdvocate", 0.14),
    ("Volunteer", 0.11),
    ("SkillsContributor", 0.09),
    ("PartnerOrganization", 0.06),
]
ACQUISITION_CHANNELS = ["Website", "WordOfMouth", "SocialMedia", "Event", "Church", "PartnerReferral"]
ACQ_WEIGHTS = [0.30, 0.20, 0.20, 0.12, 0.10, 0.08]

RELATIONSHIP_TYPES = ["Individual", "Corporate", "Foundation", "Church", "NGO"]
REGIONS = ["North America", "Asia Pacific", "Europe", "Latin America"]
COUNTRIES = ["United States", "Philippines", "Canada", "United Kingdom", "Australia"]

DONATION_TYPES = ["Monetary", "InKind", "Time", "SocialMedia", "Skills"]
DON_TYPE_WEIGHTS = [0.50, 0.22, 0.12, 0.08, 0.08]

CHANNEL_SOURCES = ["Website", "MobileApp", "InPerson", "BankTransfer", "SocialMedia"]
IMPACT_UNITS = ["USD", "Items", "Hours", "Shares", "Sessions"]
CAMPAIGNS = [None, "HolidayGiving", "GivingTuesday", "SpringDrive", "BackToSchool", "YearEnd", "EmergencyRelief"]

# ── base churn probability by acquisition channel ──
ACQ_CHURN_BASE = {
    "Church": 0.08,
    "WordOfMouth": 0.10,
    "PartnerReferral": 0.12,
    "Event": 0.16,
    "Website": 0.22,
    "SocialMedia": 0.35,
}


def _pick_weighted(items_weights):
    items, weights = zip(*items_weights)
    return random.choices(items, weights=weights, k=1)[0]


def _generate_supporter(idx):
    stype = _pick_weighted(SUPPORTER_TYPES)
    acq = random.choices(ACQUISITION_CHANNELS, weights=ACQ_WEIGHTS, k=1)[0]
    is_org = stype == "PartnerOrganization"

    first = None if is_org else fake.first_name()
    last = None if is_org else fake.last_name()
    org = fake.company() if is_org else None
    display = org if is_org else f"{first} {last}"
    rel = "Corporate" if is_org else random.choice(["Individual", "Foundation", "Church"])
    region = random.choice(REGIONS)
    country = random.choice(COUNTRIES)
    email = fake.email()
    phone = fake.phone_number()[:20]

    created = fake.date_time_between(start_date="-4y", end_date="-60d")

    return {
        "SupporterType": stype,
        "DisplayName": display,
        "OrganizationName": org,
        "FirstName": first,
        "LastName": last,
        "RelationshipType": rel,
        "Region": region,
        "Country": country,
        "Email": email,
        "Phone": phone,
        "AcquisitionChannel": acq,
        "CreatedAt": created,
        # placeholders filled after donation generation
        "Status": None,
        "FirstDonationDate": None,
    }


def _generate_donations_for(supporter_id, supporter, today):
    """Return list of donation dicts and whether the donor is recurring."""
    created = supporter["CreatedAt"]
    stype = supporter["SupporterType"]
    acq = supporter["AcquisitionChannel"]

    # number of donations: Poisson-ish, influenced by type
    lam = {"MonetaryDonor": 8, "InKindDonor": 5, "SocialMediaAdvocate": 4,
           "Volunteer": 6, "SkillsContributor": 3, "PartnerOrganization": 10}
    n_donations = max(1, int(np.random.poisson(lam.get(stype, 5))))

    # recurring probability depends on channel (WordOfMouth, Church higher)
    recurring_prob = 0.15
    if acq in ("WordOfMouth", "Church"):
        recurring_prob = 0.45
    elif acq == "PartnerReferral":
        recurring_prob = 0.35
    elif acq == "SocialMedia":
        recurring_prob = 0.08

    is_recurring = random.random() < recurring_prob

    donations = []
    dates = sorted([
        fake.date_time_between(start_date=created, end_date=today - timedelta(days=1))
        for _ in range(n_donations)
    ])

    for i, dt in enumerate(dates):
        dtype = random.choices(DONATION_TYPES, weights=DON_TYPE_WEIGHTS, k=1)[0]
        if stype == "MonetaryDonor" and i < 2:
            dtype = "Monetary"

        amount = None
        est_value = None
        currency = None

        if dtype == "Monetary":
            amount = round(random.uniform(10, 500) * (1.5 if is_recurring else 1.0), 2)
            est_value = amount
            currency = "USD"
        elif dtype == "InKind":
            est_value = round(random.uniform(20, 300), 2)
        elif dtype == "Time":
            est_value = round(random.uniform(15, 200), 2)
        elif dtype == "SocialMedia":
            est_value = round(random.uniform(5, 50), 2)
        elif dtype == "Skills":
            est_value = round(random.uniform(50, 400), 2)

        impact = {"Monetary": "USD", "InKind": "Items", "Time": "Hours",
                  "SocialMedia": "Shares", "Skills": "Sessions"}

        donations.append({
            "SupporterId": supporter_id,
            "DonationType": dtype,
            "DonationDate": dt,
            "ChannelSource": random.choice(CHANNEL_SOURCES),
            "CurrencyCode": currency,
            "Amount": amount,
            "EstimatedValue": est_value,
            "ImpactUnit": impact.get(dtype, "USD"),
            "IsRecurring": is_recurring,
            "CampaignName": random.choice(CAMPAIGNS),
            "Notes": "",
            "ReferralPostId": None,
        })

    return donations, is_recurring, dates


def _decide_churn(supporter, is_recurring, donation_dates, today):
    """Stochastically decide Active/Inactive with embedded causal effects."""
    acq = supporter["AcquisitionChannel"]
    base = ACQ_CHURN_BASE.get(acq, 0.20)

    if is_recurring:
        base *= 0.20   # recurring drops churn dramatically

    if donation_dates:
        days_since = (today - max(donation_dates)).days
        if days_since > 365:
            base += 0.30
        elif days_since > 180:
            base += 0.15
        elif days_since < 60:
            base -= 0.08

    n_types = len({d for d in ["Monetary", "InKind", "Time", "SocialMedia", "Skills"]})
    type_diversity = len({d["DonationType"] for d in donation_dates}) if isinstance(donation_dates, list) else 1
    # more diverse → slightly lower churn
    base -= 0.02 * min(type_diversity, 4)

    base = max(0.02, min(base, 0.70))
    return "Inactive" if random.random() < base else "Active"


def main():
    engine = _get_engine()
    today = datetime.now()

    # find current max IDs so we can set FirstDonationDate before insert
    with engine.connect() as conn:
        max_sid = conn.execute(
            __import__("sqlalchemy").text("SELECT ISNULL(MAX(SupporterId),0) FROM dbo.Supporters")
        ).scalar()

    print(f"Current max SupporterId: {max_sid}")
    print(f"Generating {N_NEW_SUPPORTERS} synthetic supporters …")

    supporter_rows = []
    donation_rows = []

    for i in range(N_NEW_SUPPORTERS):
        sup = _generate_supporter(i)
        sid_placeholder = max_sid + 1 + i  # approximate; real ID assigned by IDENTITY

        dons, is_rec, dates = _generate_donations_for(sid_placeholder, sup, today)

        # fix the _decide_churn call – pass donation dicts for type diversity
        status = _decide_churn_v2(sup, is_rec, dons, today)
        sup["Status"] = status
        sup["FirstDonationDate"] = min(dates) if dates else None
        supporter_rows.append(sup)
        donation_rows.append(dons)

    statuses = [s["Status"] for s in supporter_rows]
    n_inactive = sum(1 for s in statuses if s == "Inactive")
    print(f"Churn rate: {n_inactive}/{N_NEW_SUPPORTERS} = {n_inactive/N_NEW_SUPPORTERS:.1%}")

    # ── Insert supporters ──
    sup_df = pd.DataFrame(supporter_rows)
    sup_df.to_sql("Supporters", engine, schema="dbo", if_exists="append", index=False)
    print(f"Inserted {len(sup_df)} supporters")

    # ── Fetch back assigned IDs (IDENTITY) ──
    with engine.connect() as conn:
        new_ids = pd.read_sql(
            __import__("sqlalchemy").text(
                f"SELECT SupporterId FROM dbo.Supporters WHERE SupporterId > {max_sid} ORDER BY SupporterId"
            ),
            conn,
        )["SupporterId"].tolist()

    if len(new_ids) != N_NEW_SUPPORTERS:
        print(f"WARNING: expected {N_NEW_SUPPORTERS} new IDs, got {len(new_ids)}")

    # ── Fix donation SupporterIds and insert ──
    all_dons = []
    for idx, dons in enumerate(donation_rows):
        real_sid = new_ids[idx]
        for d in dons:
            d["SupporterId"] = real_sid
            all_dons.append(d)

    don_df = pd.DataFrame(all_dons)
    don_df.to_sql("Donations", engine, schema="dbo", if_exists="append", index=False)
    print(f"Inserted {len(don_df)} donations")
    print("Done!")


def _decide_churn_v2(supporter, is_recurring, donations_list, today):
    """Stochastically decide Active/Inactive with embedded causal effects."""
    acq = supporter["AcquisitionChannel"]
    base = ACQ_CHURN_BASE.get(acq, 0.20)

    if is_recurring:
        base *= 0.20

    if donations_list:
        dates = [d["DonationDate"] for d in donations_list]
        days_since = (today - max(dates)).days
        if days_since > 365:
            base += 0.30
        elif days_since > 180:
            base += 0.15
        elif days_since < 60:
            base -= 0.08

        type_diversity = len({d["DonationType"] for d in donations_list})
        base -= 0.02 * min(type_diversity, 4)

    base = max(0.02, min(base, 0.70))
    return "Inactive" if random.random() < base else "Active"


if __name__ == "__main__":
    main()
