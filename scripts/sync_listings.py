#!/usr/bin/env python3
"""
Sync _listings/*.md files from the public Google Sheet.

Usage:
    python scripts/sync_listings.py

Behaviour:
- Rows without a value in 'ready_to_add' are skipped.
  If a local file already exists for that listing_id it is left untouched.
- New rows create a new .md file with last_updated = today.
- Existing rows are overwritten only when content has changed;
  last_updated is bumped to today only on actual changes.
- Local .md files whose stem does not appear in the sheet at all
  are reported at the end for manual review/deletion.
"""

import csv
import io
import os
import re
import urllib.request
from datetime import date

SHEET_ID = "1oK6cflZ8ABKkoDx3uEaMDRdNulCao1L2EVW2PrwC0c8"
CSV_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"
)
LISTINGS_DIR = os.path.join(os.path.dirname(__file__), "..", "_listings")
TODAY = date.today().isoformat()


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

def fetch_rows():
    with urllib.request.urlopen(CSV_URL) as response:
        content = response.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(content)))


# ---------------------------------------------------------------------------
# Building file content
# ---------------------------------------------------------------------------

def parse_csv_list(value):
    """'Cologne, Frankfurt' -> ['Cologne', 'Frankfurt']"""
    return [v.strip() for v in value.split(",") if v.strip()]


def yaml_quote(value):
    """Wrap a string in double quotes, escaping inner double quotes."""
    return '"' + value.replace('"', '\\"') + '"'


def build_file(row, last_updated):
    title = row["title"].strip()
    cities = parse_csv_list(row["cities"])
    tags = parse_csv_list(row["tags"])
    external_url = row["external_url"].strip()
    short_description = row["short_description"].strip()
    long_description = row.get("long_description", "").strip()

    lines = ["---"]
    lines.append(f"title: {yaml_quote(title)}")
    lines.append(f"tags: [{', '.join(tags)}]")
    lines.append(f"cities: [{', '.join(cities)}]")
    lines.append(f"last_updated: {last_updated}")
    if external_url:
        lines.append(f"external_url: {external_url}")
    lines.append(f"short_description: {yaml_quote(short_description)}")
    lines.append("---")

    body = long_description if long_description else short_description
    return "\n".join(lines) + "\n" + body + "\n"


def strip_last_updated(content):
    """Remove the last_updated line so content can be compared ignoring it."""
    return re.sub(r"^last_updated:.*\n", "", content, flags=re.MULTILINE)


def read_existing_last_updated(content):
    m = re.search(r"^last_updated:\s*(.+)$", content, re.MULTILINE)
    return m.group(1).strip() if m else TODAY


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Fetching sheet…")
    rows = fetch_rows()

    sheet_ids = set()
    added = []
    updated = []
    unchanged = []
    skipped_no_ready = []

    for row in rows:
        listing_id = row.get("listing_id", "").strip()
        ready_to_add = row.get("ready_to_add", "").strip()
        if not listing_id:
            continue

        sheet_ids.add(listing_id)
        filepath = os.path.join(LISTINGS_DIR, f"{listing_id}.md")

        if not ready_to_add:
            if os.path.exists(filepath):
                skipped_no_ready.append(listing_id)
            continue

        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                existing = f.read()

            existing_last_updated = read_existing_last_updated(existing)
            candidate = build_file(row, existing_last_updated)

            if strip_last_updated(existing) == strip_last_updated(candidate):
                unchanged.append(listing_id)
                continue

            # Content changed — bump last_updated to today
            new_content = build_file(row, TODAY)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            updated.append(listing_id)
        else:
            new_content = build_file(row, TODAY)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            added.append(listing_id)

    # Find local files not referenced by the sheet at all
    local_stems = {
        os.path.splitext(f)[0]
        for f in os.listdir(LISTINGS_DIR)
        if f.endswith(".md")
    }
    orphaned = sorted(local_stems - sheet_ids)

    # Report
    print()
    print("=== Sync complete ===")
    print(f"  Added:     {len(added)}")
    for i in added:
        print(f"    + {i}.md")
    print(f"  Updated:   {len(updated)}")
    for i in updated:
        print(f"    ~ {i}.md")
    print(f"  Unchanged: {len(unchanged)}")

    if skipped_no_ready:
        print()
        print(
            f"Skipped — 'ready_to_add' empty, existing file left untouched: "
            f"{len(skipped_no_ready)}"
        )
        for i in skipped_no_ready:
            print(f"    {i}.md")

    if orphaned:
        print()
        print(
            "Files not found in sheet — delete manually if no longer needed:"
        )
        for i in orphaned:
            print(f"    _listings/{i}.md")


if __name__ == "__main__":
    main()
