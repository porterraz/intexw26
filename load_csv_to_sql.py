import argparse
import os
import urllib.parse
from pathlib import Path

import pandas as pd
import pyodbc
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect


def build_engine():
    load_dotenv()

    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    username = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")

    missing = [
        key
        for key, value in {
            "DB_SERVER": server,
            "DB_NAME": database,
            "DB_USER": username,
            "DB_PASSWORD": password,
        }.items()
        if not value
    ]
    if missing:
        raise ValueError(f"Missing environment variables: {', '.join(missing)}")

    installed_drivers = set(pyodbc.drivers())
    preferred_driver = os.getenv("DB_ODBC_DRIVER", "ODBC Driver 18 for SQL Server")
    if preferred_driver in installed_drivers:
        driver = preferred_driver
    elif "ODBC Driver 17 for SQL Server" in installed_drivers:
        driver = "ODBC Driver 17 for SQL Server"
    else:
        raise ValueError(
            "No supported SQL Server ODBC driver found. Install ODBC Driver 17 or 18."
        )

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    params = urllib.parse.quote_plus(conn_str)
    return create_engine(
        f"mssql+pyodbc:///?odbc_connect={params}",
        fast_executemany=True,
    )


def _norm(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def _resolve_table_name(engine, csv_stem: str) -> str:
    insp = inspect(engine)
    existing = insp.get_table_names(schema="dbo")
    norm_map = {_norm(t): t for t in existing}
    return norm_map.get(_norm(csv_stem), csv_stem)


def _default_for_column(col: dict):
    data_type = (col.get("type") or "").__class__.__name__.lower()
    # SQLAlchemy inspector types vary by dialect class names.
    if any(k in data_type for k in ("int", "bigint", "smallint")):
        return 0
    if any(k in data_type for k in ("decimal", "numeric", "float", "real")):
        return 0
    if "bool" in data_type or "bit" in data_type:
        return False
    if "datetime" in data_type or "date" in data_type:
        return "1900-01-01"
    return ""


def _sanitize_for_constraints(engine, table_name: str, df: pd.DataFrame, table_columns: list[dict]) -> pd.DataFrame:
    if df.empty:
        return df

    insp = inspect(engine)
    nullable_map = {c["name"]: c.get("nullable", True) for c in table_columns}

    # Validate foreign keys against referenced tables.
    for fk in insp.get_foreign_keys(table_name):
        cols = fk.get("constrained_columns") or []
        ref_cols = fk.get("referred_columns") or []
        ref_table = fk.get("referred_table")
        if len(cols) != 1 or len(ref_cols) != 1 or not ref_table:
            continue

        col = cols[0]
        ref_col = ref_cols[0]
        if col not in df.columns:
            continue

        valid_df = pd.read_sql(f"SELECT [{ref_col}] AS v FROM dbo.[{ref_table}]", con=engine)
        if valid_df.empty:
            valid = set()
        else:
            valid = set(pd.to_numeric(valid_df["v"], errors="coerce").dropna().astype(int).tolist())

        vals_num = pd.to_numeric(df[col], errors="coerce")
        vals_int = vals_num.fillna(-1).astype(int)
        invalid_mask = vals_num.notna() & ~vals_int.isin(valid)

        if not invalid_mask.any():
            continue

        if nullable_map.get(col, True):
            df.loc[invalid_mask, col] = pd.NA
        else:
            before = len(df)
            df = df.loc[~invalid_mask].copy()
            removed = before - len(df)
            if removed:
                print(f"Dropped {removed} rows from '{table_name}' due to invalid required FK '{col}'.")

    # Fill required non-null columns if CSV has blanks/NaN.
    for col in table_columns:
        col_name = col["name"]
        if col_name not in df.columns:
            continue

        nullable = col.get("nullable", True)
        if not nullable:
            default = _default_for_column(col)
            df[col_name] = df[col_name].fillna(default)
            if isinstance(default, str):
                df[col_name] = df[col_name].replace("", default)

    return df


def load_one_csv(engine, csv_path, table_name, if_exists, chunksize):
    df = pd.read_csv(csv_path)
    insp = inspect(engine)
    table_columns = insp.get_columns(table_name)
    if table_columns:
        col_map = {_norm(c["name"]): c["name"] for c in table_columns}
        identity_cols = {
            c["name"]
            for c in table_columns
            if c.get("autoincrement") in (True, "auto")
        }

        renamed = {}
        for col in df.columns:
            mapped = col_map.get(_norm(col))
            if mapped:
                renamed[col] = mapped
        if renamed:
            df = df.rename(columns=renamed)

        keep_cols = [c["name"] for c in table_columns if c["name"] in df.columns and c["name"] not in identity_cols]
        df = df[keep_cols]
        df = _sanitize_for_constraints(engine, table_name, df, table_columns)

    if df.empty:
        print(f"Skipped '{csv_path}' for '{table_name}' (no mappable columns).")
        return

    df.to_sql(
        table_name,
        con=engine,
        if_exists=if_exists,
        index=False,
        chunksize=chunksize,
    )
    print(f"Loaded {len(df)} rows from '{csv_path}' into '{table_name}'.")


def reset_database(engine):
    drop_foreign_keys_sql = """
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql +=
        N'ALTER TABLE [' + SCHEMA_NAME(t.schema_id) + N'].[' + t.name + N'] DROP CONSTRAINT [' + fk.name + N'];'
    FROM sys.foreign_keys fk
    INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id;
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;
    """

    drop_tables_sql = """
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql +=
        N'DROP TABLE [' + s.name + N'].[' + t.name + N'];'
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.is_ms_shipped = 0;
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;
    """

    with engine.begin() as conn:
        conn.exec_driver_sql(drop_foreign_keys_sql)
        conn.exec_driver_sql(drop_tables_sql)

    print("Dropped all existing user tables from the target database.")


def main():
    parser = argparse.ArgumentParser(description="Load CSV file(s) into SQL Server.")
    parser.add_argument("--csv", help="Path to one CSV file.")
    parser.add_argument("--table", help="Destination table name (single-file mode).")
    parser.add_argument(
        "--csv-dir",
        default="lighthouse_csv_v7",
        help="Folder to scan recursively for CSV files (default: lighthouse_csv_v7).",
    )
    parser.add_argument(
        "--if-exists",
        choices=["fail", "replace", "append"],
        default="append",
        help="Behavior if table already exists (default: append).",
    )
    parser.add_argument(
        "--chunksize",
        type=int,
        default=1000,
        help="Rows per batch insert (default: 1000).",
    )
    parser.add_argument(
        "--reset-db",
        action="store_true",
        help="Drop all existing user tables before loading CSV files.",
    )
    args = parser.parse_args()

    engine = build_engine()
    if args.reset_db:
        reset_database(engine)

    if args.csv:
        if not args.table:
            raise ValueError("--table is required when using --csv.")
        load_one_csv(engine, args.csv, args.table, args.if_exists, args.chunksize)
        return

    csv_dir = Path(args.csv_dir)
    if not csv_dir.exists() or not csv_dir.is_dir():
        raise ValueError(f"CSV directory not found: {csv_dir}")

    csv_files = sorted(csv_dir.rglob("*.csv"))
    if not csv_files:
        raise ValueError(f"No CSV files found in directory: {csv_dir}")

    # Load parent tables before dependent tables to satisfy foreign keys.
    load_order = {
        "safehouses": 1,
        "supporters": 2,
        "social_media_posts": 3,
        "residents": 4,
        "partners": 5,
        "donations": 6,
        "partner_assignments": 7,
        "education_records": 8,
        "health_wellbeing_records": 9,
        "home_visitations": 10,
        "incident_reports": 11,
        "intervention_plans": 12,
        "process_recordings": 13,
        "safehouse_monthly_metrics": 14,
        "donation_allocations": 15,
        "in_kind_donation_items": 16,
        "public_impact_snapshots": 17,
    }
    csv_files = sorted(csv_files, key=lambda p: (load_order.get(p.stem, 1000), p.stem))

    for csv_file in csv_files:
        table_name = _resolve_table_name(engine, csv_file.stem)
        load_one_csv(engine, str(csv_file), table_name, args.if_exists, args.chunksize)


if __name__ == "__main__":
    main()
