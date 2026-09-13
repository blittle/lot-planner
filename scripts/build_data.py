#!/usr/bin/env python3
"""Regenerates data.js from "Plant List.csv"."""
import csv
import json
import re

CSV_PATH = "Plant List.csv"
OUT_PATH = "data.js"
IMAGE_WIDTH_FT = 141.79
IMAGE_PX_WIDTH = 1162
IMAGE_PX_HEIGHT = 837

SEASONS = ["Spring", "Early Summer", "Mid Summer", "Late Summer", "Fall"]


def slugify(*parts):
    """Builds a stable id from plant identity fields.

    Row order in the CSV shifts every time it's re-sorted or edited, so a
    positional id (row 1, row 2, ...) would silently reassign every
    previously-placed plant on the map to a different species after any
    re-export. A content-derived id stays the same across regenerations as
    long as the plant's own name doesn't change, and safely fails to match
    (rather than matching the wrong plant) if it does.
    """
    text = "-".join(p for p in parts if p)
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

# Bloom-time values in the CSV that don't exactly match a dropdown season
# bucket get folded into the nearest one for filtering purposes.
SEASON_ALIASES = {
    "Late Spring": "Spring",
}

RANGE_RE = re.compile(r"([\d.]+)\s*(?:[–‒-]\s*([\d.]+))?\s*(ft|in)?", re.IGNORECASE)


def parse_range_ft(text):
    """Parses a size string like '12–15 ft' or '1-2 in' into (min_ft, max_ft)."""
    text = (text or "").strip()
    if not text:
        return (None, None)
    m = RANGE_RE.match(text)
    if not m:
        return (None, None)
    lo = float(m.group(1))
    hi = float(m.group(2)) if m.group(2) else lo
    unit = (m.group(3) or "ft").lower()
    if unit == "in":
        lo, hi = lo / 12.0, hi / 12.0
    return (round(lo, 2), round(hi, 2))


def parse_seasons(bloom_time):
    seasons = set()
    for part in (bloom_time or "").split(","):
        part = part.strip()
        if not part:
            continue
        seasons.add(SEASON_ALIASES.get(part, part))
    return [s for s in SEASONS if s in seasons]


def display_name_for(genus, cultivar):
    if cultivar and cultivar.lower() != "straight species":
        return f"{genus} '{cultivar}'"
    return genus


def build_plant(category, genus, cultivar, height, width, color, bloom_time, spacing, fallback_index=0):
    """Builds one plant record. Shared with sync_data.py so the two stay in step."""
    height_min_ft, height_max_ft = parse_range_ft(height)
    width_min_ft, width_max_ft = parse_range_ft(width)
    height_ft = round((height_min_ft + height_max_ft) / 2, 2) if height_min_ft is not None else None
    width_ft = round((width_min_ft + width_max_ft) / 2, 2) if width_min_ft is not None else None

    return {
        "id": slugify(category, genus, cultivar) or f"plant-{fallback_index}",
        "category": category,
        "genus": genus,
        "cultivar": cultivar,
        "displayName": display_name_for(genus, cultivar),
        "height": height,
        "width": width,
        "heightFt": height_ft,
        "heightMinFt": height_min_ft,
        "heightMaxFt": height_max_ft,
        "widthFt": width_ft,
        "color": color,
        "bloomTime": bloom_time,
        "seasons": parse_seasons(bloom_time),
        "spacing": spacing,
    }


def read_csv(csv_path=CSV_PATH):
    """Reads the plant CSV into plant records. Blank category/genus cells
    inherit from the row above, matching how the sheet is actually filled in."""
    plants = []
    category = genus = ""
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            category = row["Main Category"].strip() or category
            genus = row["Plant Name / Genus"].strip() or genus
            plants.append(build_plant(
                category=category,
                genus=genus,
                cultivar=row["Cultivar / Variety"].strip(),
                height=row["Height"].strip(),
                width=row["Width"].strip(),
                color=row["Color / Characteristics"].strip(),
                bloom_time=row["Bloom Time"].strip(),
                spacing=row["Plant Spacing"].strip(),
                fallback_index=i,
            ))
    return plants


def main():
    plants = read_csv()

    data = {
        "imageWidthFt": IMAGE_WIDTH_FT,
        "imagePxWidth": IMAGE_PX_WIDTH,
        "imagePxHeight": IMAGE_PX_HEIGHT,
        "seasons": SEASONS,
        "plants": plants,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("const LOT_DATA = ")
        f.write(json.dumps(data, indent=2))
        f.write(";\n")

    print(f"Wrote {len(plants)} plants to {OUT_PATH}")


if __name__ == "__main__":
    main()
