#!/usr/bin/env python3
"""Attach Voteview DW-NOMINATE (first dimension) scores to candidates who are
sitting or recent members of Congress.

    python3 scripts/enrich-voteview.py

Downloads (needs network to voteview.com and unitedstates.github.io):
  - HS119_members.csv          ideology scores for the 119th Congress
  - legislators-current.json   name -> bioguide id for sitting members
  - legislators-historical.json  same, for members who left since 2025

Matches on normalized first + last name (nickname and quoted names count).
Ambiguous matches are skipped and printed. Rewrites data/seed/candidates.json
in place, clearing any dw_nominate it can't confirm.
"""
import csv
import io
import json
import re
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "data" / "seed" / "candidates.json"
UA = "citizen-dashboard/0.1 (progressive races seed script)"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace(".", "").strip()


def main() -> None:
    vv = list(csv.DictReader(io.StringIO(fetch("https://voteview.com/static/data/out/members/HS119_members.csv").decode())))
    dim = {r["bioguide_id"]: float(r["nominate_dim1"]) for r in vv if r["bioguide_id"] and r["nominate_dim1"]}
    people = json.loads(fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json"))
    people += [p for p in json.loads(fetch("https://unitedstates.github.io/congress-legislators/legislators-historical.json")) if p["terms"][-1].get("end", "") >= "2025-01-03"]

    index: dict[tuple[str, str], set[str]] = {}
    for p in people:
        n = p["name"]
        bg = p["id"].get("bioguide")
        if not bg:
            continue
        firsts = {norm(n["first"])}
        if n.get("nickname"):
            firsts.add(norm(n["nickname"]))
        m = re.search(r'"([^"]+)"', n.get("official_full", ""))
        if m:
            firsts.add(norm(m.group(1)))
        for f in firsts:
            index.setdefault((f, norm(n["last"])), set()).add(bg)

    cands = json.loads(CANDIDATES.read_text())
    hits = 0
    for c in cands:
        c.pop("dw_nominate", None)
        parts = c["name"].replace(",", "").split()
        first, last = norm(parts[0]), norm(parts[-1])
        if last in ("jr", "iii", "ii", "sr") and len(parts) > 2:
            last = norm(parts[-2])
        bgs = index.get((first, last), set())
        if len(bgs) == 1:
            bg = next(iter(bgs))
            if bg in dim:
                c["dw_nominate"] = dim[bg]
                hits += 1
        elif len(bgs) > 1:
            print("ambiguous, skipped:", c["name"], sorted(bgs))
    CANDIDATES.write_text(json.dumps(cands, indent=2, ensure_ascii=False) + "\n")
    print(f"attached DW-NOMINATE to {hits} candidates")


if __name__ == "__main__":
    main()
