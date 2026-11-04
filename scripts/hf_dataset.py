#!/usr/bin/env python3
"""Offline lexical retrieval + pinned, checksum-verified HF code retrieval. Never exports reasoning traces."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import ssl
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
DATASET = "ccore/ThreeJS-3D-Scenes"
REVISION = "57b77a19d38eee8316c8b1f9e71c772046d9f48c"
CATALOG = ROOT / "data/hf-catalog.jsonl"
TOKEN = re.compile(r"[a-z0-9]+")


def tokens(text):
    return TOKEN.findall(text.lower().replace("_", " "))


def search(rows, query, limit=5, min_level=1, include_voxel=False):
    docs = []
    for row in rows:
        if row["level"] < min_level or (row["voxel"] and not include_voxel):
            continue
        words = tokens((row["title"] + " ") * 3 + (row["domain"] + " ") * 2 + row["prompt"])
        docs.append((row, Counter(words), len(words)))
    terms = set(tokens(query))
    if not terms or not docs:
        return []
    df = {term: sum(term in counts for _, counts, _ in docs) for term in terms}
    average = sum(length for _, _, length in docs) / len(docs)
    results = []
    for row, counts, length in docs:
        score = 0
        for term in terms:
            f = counts[term]
            if f:
                idf = math.log(1 + (len(docs) - df[term] + 0.5) / (df[term] + 0.5))
                score += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * length / average))
        if score:
            results.append({**row, "score": round(score, 4)})
    return sorted(results, key=lambda r: (-r["score"], r["id"]))[:limit]


def code_from_row(row):
    content = "\n".join(m.get("content") or "" for m in row["messages"] if m["role"] == "assistant")
    blocks = re.findall(r"```(?:html|HTML)\s*\n([\s\S]*?)```", content)
    code = next((b for b in blocks if "<html" in b.lower()), None)
    if code is None:
        start = re.search(r"<!doctype html|<html", content, re.I)
        end = content.lower().rfind("</html>")
        if not start or end < start.start():
            raise ValueError("Assistant response does not contain a complete HTML scene")
        code = content[start.start():end + 7]
    return code.strip() + "\n"


def tls_context():
    # Some standalone Python builds do not use the OS CA store; never disable TLS verification.
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def download_shard(name, cache, expected_sha):
    dest = cache / name
    cache.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        if hashlib.sha256(dest.read_bytes()).hexdigest() != expected_sha:
            raise ValueError(f"Cached shard checksum mismatch: {dest}. Remove it and retry.")
        return dest
    temporary = dest.with_suffix(".download")
    url = f"https://huggingface.co/datasets/{DATASET}/resolve/{REVISION}/data/{name}"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "unrealmotion-skill/1.0"})
        digest = hashlib.sha256()
        with urllib.request.urlopen(request, context=tls_context(), timeout=90) as response, temporary.open("wb") as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
                digest.update(chunk)
        if digest.hexdigest() != expected_sha:
            raise ValueError("Downloaded shard checksum mismatch")
        temporary.replace(dest)
    finally:
        temporary.unlink(missing_ok=True)
    return dest


def parquet():
    try:
        import pyarrow.parquet as pq
        return pq
    except ImportError as error:
        raise RuntimeError("Code retrieval needs pyarrow: python3 -m pip install -r requirements-dataset.txt") from error


def fetch_scene(row, cache, output):
    manifest = json.loads((ROOT / "data/hf-source.json").read_text())
    shard = next(s for s in manifest["shards"] if s["file"] == row["shard"])
    file = download_shard(row["shard"], cache, shard["sha256"])
    source = parquet().read_table(file).slice(row["row"], 1).to_pylist()[0]
    if source["id"] != row["id"]:
        raise ValueError("Catalog row and pinned shard disagree")
    code = code_from_row(source)
    # Only response code leaves the parquet cache. reasoning_content is neither copied nor logged.
    output.mkdir(parents=True, exist_ok=False)
    (output / "scene.html").write_text(code, encoding="utf-8")
    (output / "LICENSE").write_bytes((ROOT / "data/CCORE-LICENSE").read_bytes())
    provenance = {**row, "dataset": DATASET, "revision": REVISION,
                  "source": f"https://huggingface.co/datasets/{DATASET}/blob/{REVISION}/data/{row['shard']}",
                  "license": "MIT", "codeSha256": hashlib.sha256(code.encode()).hexdigest(),
                  "usage": "Reference code. Adapt to deterministic local runtime before execution."}
    (output / "provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"id": row["id"], "output": str(output), "codeSha256": provenance["codeSha256"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache/hf")
    sub = parser.add_subparsers(dest="command", required=True)
    s = sub.add_parser("search", help="Offline BM25 retrieval; use English subject/material terms")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=5)
    s.add_argument("--min-level", type=int, default=1)
    s.add_argument("--include-voxel", action="store_true")
    f = sub.add_parser("fetch", help="Download the pinned code shard and extract one HTML response")
    f.add_argument("id")
    f.add_argument("--output", required=True, type=Path)
    o = parser.parse_args()
    rows = [json.loads(line) for line in CATALOG.read_text(encoding="utf-8").splitlines() if line]
    if o.command == "search":
        if not 1 <= o.limit <= 50 or not 1 <= o.min_level <= 10:
            parser.error("limit must be 1–50; min-level must be 1–10")
        result = search(rows, o.query, o.limit, o.min_level, o.include_voxel)
    else:
        row = next((r for r in rows if r["id"] == o.id), None)
        if row is None:
            parser.error("Unknown scene id; use search first")
        result = fetch_scene(row, o.cache.resolve(), o.output.resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(f"HF retrieval: {error}", file=sys.stderr)
        sys.exit(1)
