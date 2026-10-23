#!/usr/bin/env python3
"""Print the names of deployable contract crates, one per line.

Reads `cargo metadata --no-deps --format-version 1` on stdin. A crate counts as
deployable when its manifest sits under <workspace_root>/contracts/ and it has a
cdylib target. Matching on the path relative to the workspace root (not an
absolute substring) matters: the workspace root directory is itself named
"contracts", so "/contracts/" would also match libs/ and tests/, whose crates
depend on soroban-sdk with the "testutils" feature and cannot compile for wasm.
"""
import json
import os
import sys

meta = json.load(sys.stdin)
root = meta["workspace_root"].replace("\\", "/").rstrip("/")
for pkg in meta["packages"]:
    path = pkg["manifest_path"].replace("\\", "/")
    rel = os.path.relpath(path, root).replace("\\", "/")
    if not rel.startswith("contracts/"):
        continue
    if "/test_fixtures/" in "/" + rel:
        continue
    if not any("cdylib" in t["kind"] for t in pkg["targets"]):
        continue
    print(pkg["name"])
