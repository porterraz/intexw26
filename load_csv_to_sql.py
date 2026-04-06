import argparse
import os
import urllib.parse
from pathlib import Path

import pandas as pd
import pyodbc
from dotenv import load_dotenv
from sqlalchemy import create_engine


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


def load_one_csv(engine, csv_path, table_name, if_exists, chunksize):
    df = pd.read_csv(csv_path)
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

    for csv_file in csv_files:
        table_name = csv_file.stem
        load_one_csv(engine, str(csv_file), table_name, args.if_exists, args.chunksize)


if __name__ == "__main__":
    main()
