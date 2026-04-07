import pandas as pd
import urllib
import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load credentials from the .env file
load_dotenv()

server = os.getenv('DB_SERVER')
database = os.getenv('DB_NAME')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
driver = '{ODBC Driver 18 for SQL Server}'

if not all([server, database, username, password]):
    print("❌ Error: Missing database credentials in .env file.")
    exit()

# Create the SQLAlchemy Engine
params = urllib.parse.quote_plus(
    f'Driver={driver};Server=tcp:{server},1433;Database={database};Uid={username};Pwd={password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=60;'
)
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}", fast_executemany=True)

CSV_DIR = 'lighthouse_csv_v7/lighthouse_csv_v7/'

# Table mapping in critical FK order
tables_to_load = {
    'safehouses.csv': 'Safehouses',
    'supporters.csv': 'Supporters',
    'partners.csv': 'Partners',
    'social_media_posts.csv': 'SocialMediaPosts',
    'public_impact_snapshots.csv': 'PublicImpactSnapshots',
    'residents.csv': 'Residents',
    'donations.csv': 'Donations',
    'safehouse_monthly_metrics.csv': 'SafehouseMonthlyMetrics',
    'incident_reports.csv': 'IncidentReports',
    'health_wellbeing_records.csv': 'HealthWellbeingRecords',
    'education_records.csv': 'EducationRecords',
    'intervention_plans.csv': 'InterventionPlans',
    'donation_allocations.csv': 'DonationAllocations',
    'in_kind_donation_items.csv': 'InKindDonationItems',
    'home_visitations.csv': 'HomeVisitations',
    'process_recordings.csv': 'ProcessRecordings',
    'partner_assignments.csv': 'PartnerAssignments'
}

print(f"🚀 Connecting to {server}...")

with engine.begin() as conn:
    for csv_file, table_name in tables_to_load.items():
        file_path = os.path.join(CSV_DIR, csv_file)
        if os.path.exists(file_path):
            print(f"Loading {csv_file} -> [{table_name}]...")
            df = pd.read_csv(file_path)
            try:
                # Use append to avoid dropping tables created by EF Core
                df.to_sql(table_name, conn, schema='dbo', if_exists='append', index=False)
                print(f"   ✅ Success: {len(df)} rows added.")
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
        else:
            print(f"⚠️ Warning: {file_path} not found.")

    # Seed the ML recommendations if the file exists
    if os.path.exists('Resident_Recommendations.csv'):
        print("\n🧠 Seeding ML Recommendations...")
        df_ml = pd.read_csv('Resident_Recommendations.csv')
        df_ml.to_sql('ResidentRecommendations', conn, schema='dbo', if_exists='replace', index=False)
        print("   ✅ ML Data Seeded!")

print("\n🎉 Database population complete!")