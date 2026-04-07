import pandas as pd
import urllib
from sqlalchemy import create_engine, text
import os

# ==========================================
# 1. AZURE SQL CONNECTION SETTINGS
# Replace these with your Azure SQL Database details
# ==========================================
server = 'YOUR_SERVER_NAME.database.windows.net' # e.g., novapath-db-server.database.windows.net
database = 'YOUR_DATABASE_NAME'
username = 'YOUR_ADMIN_USERNAME'
password = 'YOUR_ADMIN_PASSWORD'
driver = '{ODBC Driver 18 for SQL Server}' # Use 17 if 18 throws an error

# Create the SQLAlchemy Engine
params = urllib.parse.quote_plus(
    f'Driver={driver};Server=tcp:{server},1433;Database={database};Uid={username};Pwd={password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=60;'
)
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}", fast_executemany=True)

# ==========================================
# 2. TABLE MAPPING & INSERTION ORDER
# Order is critical to avoid Foreign Key constraint errors!
# ==========================================
CSV_DIR = 'lighthouse_csv_v7/lighthouse_csv_v7/'

# Dictionary format: 'csv_filename': 'ExactEFCoreTableName'
tables_to_load = {
    # 1. Base Tables (No dependencies)
    'safehouses.csv': 'Safehouses',
    'supporters.csv': 'Supporters',
    'partners.csv': 'Partners',
    'social_media_posts.csv': 'SocialMediaPosts',
    'public_impact_snapshots.csv': 'PublicImpactSnapshots',
    
    # 2. Level 1 Dependencies
    'residents.csv': 'Residents', # Depends on Safehouse
    'donations.csv': 'Donations', # Depends on Supporter
    'safehouse_monthly_metrics.csv': 'SafehouseMonthlyMetrics', # Depends on Safehouse
    
    # 3. Level 2 Dependencies (Tied to Residents or Donations)
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

# ==========================================
# 3. EXECUTE UPLOAD
# ==========================================
print("🚀 Connecting to Azure SQL and starting upload...")

# Use a single connection block for faster execution
with engine.begin() as conn:
    for csv_file, table_name in tables_to_load.items():
        file_path = os.path.join(CSV_DIR, csv_file)

        if os.path.exists(file_path):
            print(f"Loading {csv_file} into [{table_name}]...")
            df = pd.read_csv(file_path)
            
            try:
                # We use if_exists='append' so we don't destroy the schema Entity Framework created
                df.to_sql(table_name, conn, schema='dbo', if_exists='append', index=False)
                print(f"   ✅ Success: {len(df)} rows added to {table_name}")
            except Exception as e:
                print(f"   ❌ Error loading {table_name}. (Check if data already exists or FK error)")
                print(f"      Details: {str(e)[:200]}")
        else:
            print(f"⚠️ Warning: Could not find {file_path}")

    # ==========================================
    # 4. UPLOAD MACHINE LEARNING RECOMMENDATIONS
    # ==========================================
    ml_file = 'Resident_Recommendations.csv'
    if os.path.exists(ml_file):
        print(f"\n🧠 Loading ML Data: {ml_file} into [ResidentRecommendations]...")
        try:
            df_ml = pd.read_csv(ml_file)
            # We use 'replace' here in case you run the ML script multiple times and want fresh recs
            df_ml.to_sql('ResidentRecommendations', conn, schema='dbo', if_exists='replace', index=False)
            print(f"   ✅ Success: ML Recommendations Seeded!")
        except Exception as e:
            print(f"   ❌ Error loading ML Recommendations: {e}")

print("\n🎉 All CSV data has been sent to Azure SQL!")