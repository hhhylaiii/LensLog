"""One-time script to seed the townships table from a GeoJSON boundary file.

Usage:
    python scripts/seed_townships.py [--truncate]

Arguments:
    --truncate  Delete all existing rows before inserting (for re-seeding).

The GeoJSON file must be at backend/data/taiwan_townships.geojson.
Expected GeoJSON feature properties: TOWNNAME (str), COUNTYNAME (str).
"""
import argparse
import json
import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings  # noqa: E402

_GEOJSON_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "taiwan_townships.geojson")


def _sync_url(async_url: str) -> str:
    """Convert asyncpg URL to psycopg2 URL for the sync seed session."""
    return async_url.replace("postgresql+asyncpg://", "postgresql://")


def seed(truncate: bool = False) -> None:
    print("[seed] Connecting to database...")
    engine = create_engine(_sync_url(settings.DATABASE_URL), echo=False)

    geojson_path = os.path.abspath(_GEOJSON_PATH)
    if not os.path.exists(geojson_path):
        print(f"[seed] ERROR: GeoJSON file not found at {geojson_path}")
        print("[seed] Download the NLSC 鄉鎮市區界線 dataset and place it at backend/data/taiwan_townships.geojson")
        sys.exit(1)

    print(f"[seed] Reading {geojson_path}...")
    with open(geojson_path, encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    if not features:
        print("[seed] ERROR: GeoJSON contains no features.")
        sys.exit(1)

    with Session(engine) as session:
        table_exists = session.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'townships')")
        ).scalar()
        if not table_exists:
            print("[seed] townships table not found — skipping (run 'alembic upgrade head' first).")
            return

        if truncate:
            session.execute(text("DELETE FROM townships"))
            print("[seed] Existing rows deleted.")
        else:
            count = session.execute(text("SELECT COUNT(*) FROM townships")).scalar()
            if count > 0:
                print(f"[seed] Already seeded ({count} rows). Skipping. Use --truncate to re-seed.")
                return

        print(f"[seed] Inserting {len(features)} townships...")

        for feature in features:
            props = feature.get("properties", {})
            name = props.get("TOWNNAME", "").strip()
            county = props.get("COUNTYNAME", "").strip()
            geom_json = json.dumps(feature.get("geometry", {}))

            if not name or not county:
                continue

            session.execute(
                text(
                    "INSERT INTO townships (name, county, geom) "
                    "VALUES (:name, :county, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))"
                ),
                {"name": name, "county": county, "geom": geom_json},
            )

        session.commit()

    print(f"[seed] Done. {len(features)} rows inserted.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed townships table from GeoJSON.")
    parser.add_argument("--truncate", action="store_true", help="Delete existing rows before inserting.")
    args = parser.parse_args()
    seed(truncate=args.truncate)
