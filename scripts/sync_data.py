#!/usr/bin/env python3
"""Syncs data.js with an updated "Plant List.csv", one change type at a time.

A plain rebuild (build_data.py) throws away whatever data.js already holds,
which is fine only when the CSV is authoritative for everything. Usually it
isn't: placements on the map reference plants by id, so dropping a plant from
the catalog orphans every placement of it. This script shows what a rebuild
WOULD do, split into additions / removals / edits, and applies only the parts
you ask for.

Usage:
    python3 scripts/sync_data.py                      # report, change nothing
    python3 scripts/sync_data.py --apply              # apply additions only
    python3 scripts/sync_data.py --apply --update     # ... and field edits
    python3 scripts/sync_data.py --apply --remove     # ... and removals
    python3 scripts/sync_data.py --apply --all        # additions + edits + removals

    # Report how many saved placements each removal would orphan:
    python3 scripts/sync_data.py --export ~/Downloads/lot-planner-2026-09-13.json

Run from the repo root.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data  # noqa: E402  (needs the path tweak above)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(REPO_ROOT, "data.js")
CSV_PATH = os.path.join(REPO_ROOT, "Plant List.csv")

# Fields compared when deciding whether an existing plant "changed". Derived
# numeric fields are left out: they're recomputed from height/width, so
# reporting them too would just be the same edit listed twice.
COMPARED_FIELDS = ["height", "width", "color", "bloomTime", "spacing"]


class Colors:
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    OFF = "\033[0m"

    @classmethod
    def disable(cls):
        for name in ("GREEN", "RED", "YELLOW", "DIM", "BOLD", "OFF"):
            setattr(cls, name, "")


def read_data_js(path=DATA_JS):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    start, end = src.index("{"), src.rindex("}") + 1
    return json.loads(src[start:end])


def write_data_js(data, path=DATA_JS):
    with open(path, "w", encoding="utf-8") as f:
        f.write("const LOT_DATA = ")
        f.write(json.dumps(data, indent=2))
        f.write(";\n")


def normalize(csv_plants, existing_plants):
    """Adopts the capitalization data.js already uses for a category or genus.

    Spreadsheet cells drift in case ("Garden Phlox" vs "Garden phlox",
    "low/filler plants" vs "Low/filler plants"). Since ids are slugified the
    drift doesn't change a plant's identity, but it does split the catalog UI
    into near-duplicate groups, so match the established spelling wherever one
    exists. A value that matches nothing is left alone and reported as a
    warning instead — that's how a real typo (a "Phlox" category, say) stays
    visible rather than silently becoming a new group.
    """
    known_categories = {p["category"].lower(): p["category"] for p in existing_plants}
    known_genera = {p["genus"].lower(): p["genus"] for p in existing_plants}

    warnings = []
    seen_unknown = set()
    normalized = []

    for plant in csv_plants:
        plant = dict(plant)
        category, genus = plant["category"], plant["genus"]

        if category.lower() in known_categories:
            plant["category"] = known_categories[category.lower()]
        elif category.lower() not in seen_unknown:
            seen_unknown.add(category.lower())
            warnings.append(
                f"category {category!r} is not one of the existing categories "
                f"({', '.join(sorted(set(known_categories.values())))}) — typo, or genuinely new?"
            )

        if genus.lower() in known_genera:
            plant["genus"] = known_genera[genus.lower()]

        # Rebuild the identity fields from the corrected spellings.
        plant["displayName"] = build_data.display_name_for(plant["genus"], plant["cultivar"])
        plant["id"] = build_data.slugify(plant["category"], plant["genus"], plant["cultivar"])
        normalized.append(plant)

    return normalized, warnings


def diff(existing_plants, csv_plants):
    existing_by_id = {p["id"]: p for p in existing_plants}
    csv_by_id = {p["id"]: p for p in csv_plants}

    added = [p for p in csv_plants if p["id"] not in existing_by_id]
    removed = [p for p in existing_plants if p["id"] not in csv_by_id]

    changed = []
    for plant_id, new in csv_by_id.items():
        old = existing_by_id.get(plant_id)
        if not old:
            continue
        edits = {f: (old.get(f), new.get(f)) for f in COMPARED_FIELDS if old.get(f) != new.get(f)}
        if edits:
            changed.append((old, new, edits))

    return added, removed, changed


def placement_counts(export_path):
    """Counts placements per plant id in an exported layout, so removals can be
    reported with the damage they'd do rather than as a bare name."""
    with open(export_path, encoding="utf-8") as f:
        payload = json.load(f)
    counts = {}
    for placement in payload.get("placements", []):
        plant_id = placement.get("plantId")
        counts[plant_id] = counts.get(plant_id, 0) + 1
    return counts


def insert_in_category(plants, new_plant):
    """Appends after the last plant sharing its category, so the catalog stays
    grouped. data.js order drives the sidebar list, so new plants shouldn't
    just pile up at the bottom under an unrelated heading."""
    positions = [i for i, p in enumerate(plants) if p["category"] == new_plant["category"]]
    plants.insert(positions[-1] + 1 if positions else len(plants), new_plant)


def report(added, removed, changed, warnings, counts):
    def label(p):
        return f"{p['category']} | {p['displayName']}"

    print(f"\n{Colors.BOLD}Added — in the CSV, not yet in data.js ({len(added)}){Colors.OFF}")
    for p in added:
        print(f"  {Colors.GREEN}+{Colors.OFF} {label(p)}  {Colors.DIM}{p['id']}{Colors.OFF}")
    if not added:
        print(f"  {Colors.DIM}none{Colors.OFF}")

    print(f"\n{Colors.BOLD}Removed — in data.js, no longer in the CSV ({len(removed)}){Colors.OFF}")
    for p in removed:
        n = counts.get(p["id"], 0) if counts is not None else None
        note = ""
        if n:
            note = f"  {Colors.RED}{n} placement{'' if n == 1 else 's'} would be orphaned{Colors.OFF}"
        elif counts is not None:
            note = f"  {Colors.DIM}unplaced{Colors.OFF}"
        print(f"  {Colors.RED}-{Colors.OFF} {label(p)}  {Colors.DIM}{p['id']}{Colors.OFF}{note}")
    if not removed:
        print(f"  {Colors.DIM}none{Colors.OFF}")

    print(f"\n{Colors.BOLD}Changed — same plant, different values ({len(changed)}){Colors.OFF}")
    for old, _new, edits in changed:
        print(f"  {Colors.YELLOW}~{Colors.OFF} {label(old)}")
        for field, (before, after) in sorted(edits.items()):
            print(f"      {field}: {before!r} {Colors.DIM}->{Colors.OFF} {after!r}")
    if not changed:
        print(f"  {Colors.DIM}none{Colors.OFF}")

    if warnings:
        print(f"\n{Colors.BOLD}Warnings ({len(warnings)}){Colors.OFF}")
        for w in warnings:
            print(f"  {Colors.YELLOW}!{Colors.OFF} {w}")


def main():
    parser = argparse.ArgumentParser(
        description="Sync data.js with an updated Plant List.csv, one change type at a time.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Usage:")[1],
    )
    parser.add_argument("--csv", default=CSV_PATH, help="CSV to read (default: ./Plant List.csv)")
    parser.add_argument("--apply", action="store_true",
                        help="write data.js; without it nothing is modified")
    parser.add_argument("--no-add", dest="add", action="store_false",
                        help="skip new plants (they are included by default)")
    parser.add_argument("--remove", action="store_true",
                        help="also delete plants missing from the CSV — orphans their placements")
    parser.add_argument("--update", action="store_true",
                        help="also apply field edits to existing plants")
    parser.add_argument("--all", action="store_true", help="same as --remove --update")
    parser.add_argument("--export", metavar="FILE",
                        help="an exported layout; reports how many placements each removal costs")
    parser.add_argument("--no-color", action="store_true", help="plain output")
    args = parser.parse_args()

    if args.no_color or not sys.stdout.isatty():
        Colors.disable()
    if args.all:
        args.remove = args.update = True

    data = read_data_js()
    existing = data["plants"]
    csv_plants, warnings = normalize(build_data.read_csv(args.csv), existing)

    duplicates = len(csv_plants) - len({p["id"] for p in csv_plants})
    if duplicates:
        warnings.append(f"{duplicates} CSV row(s) collide on id with an earlier row; the last one wins")

    counts = placement_counts(args.export) if args.export else None
    added, removed, changed = diff(existing, csv_plants)
    report(added, removed, changed, warnings, counts)

    if not args.apply:
        print(f"\n{Colors.DIM}Report only. Re-run with --apply (plus --update / --remove / --all) "
              f"to write data.js.{Colors.OFF}")
        return 0

    plants = [dict(p) for p in existing]
    by_id = {p["id"]: p for p in plants}
    actions = []

    if args.update and changed:
        for _old, new, _edits in changed:
            by_id[new["id"]].update({k: new[k] for k in new})
        actions.append(f"updated {len(changed)}")

    if args.remove and removed:
        drop = {p["id"] for p in removed}
        plants = [p for p in plants if p["id"] not in drop]
        orphaned = sum(counts.get(p["id"], 0) for p in removed) if counts else 0
        actions.append(f"removed {len(removed)}"
                       + (f" (orphaning {orphaned} placements)" if orphaned else ""))

    if args.add and added:
        for p in added:
            insert_in_category(plants, p)
        actions.append(f"added {len(added)}")

    if not actions:
        print(f"\n{Colors.DIM}Nothing to do — data.js already matches the requested change types."
              f"{Colors.OFF}")
        return 0

    ids = [p["id"] for p in plants]
    if len(ids) != len(set(ids)):
        print(f"\n{Colors.RED}Aborted: duplicate plant ids would be written.{Colors.OFF}",
              file=sys.stderr)
        return 1

    data["plants"] = plants
    write_data_js(data)

    print(f"\n{Colors.BOLD}Wrote data.js{Colors.OFF} — {', '.join(actions)}. "
          f"{len(existing)} -> {len(plants)} plants.")
    if args.remove and removed:
        print(f"{Colors.YELLOW}Export your layout before opening the app:{Colors.OFF} placements of "
              f"removed plants are held aside and prompted, but only the export keeps a copy if you "
              f"choose to drop them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
