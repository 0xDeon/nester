#!/usr/bin/env python3
"""Reads launch-manifest.toml, the mainnet launch contract set (#1501).

  check <package>               exit 1 unless the package is listed and has an audited_commit
  size-gate <wasm_dir> [--only <package>...]
                                exit 1 if a listed WASM is missing or over its max_wasm_bytes
  validate                      exit 1 unless every listed package exists in the workspace
  list                          print listed package names
"""
import argparse
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = ROOT / "launch-manifest.toml"


def load(path):
    with open(path, "rb") as f:
        return tomllib.load(f).get("contract", [])


def workspace_wasm_names():
    names = {}
    for cargo in (ROOT / "contracts").glob("*/Cargo.toml"):
        with open(cargo, "rb") as f:
            data = tomllib.load(f)
        pkg = data["package"]["name"]
        names[pkg] = data.get("lib", {}).get("name", pkg.replace("-", "_"))
    return names


def cmd_check(entries, args):
    entry = next((e for e in entries if e["package"] == args.package), None)
    if entry is None:
        print(f"refused: {args.package} is not in launch-manifest.toml", file=sys.stderr)
        return 1
    if not entry.get("audited_commit"):
        print(f"refused: {args.package} has no audited_commit in launch-manifest.toml", file=sys.stderr)
        return 1
    return 0


def cmd_size_gate(entries, args):
    wasm_names = workspace_wasm_names()
    failed = False
    for e in entries:
        if args.only and e["package"] not in args.only:
            continue
        wasm = Path(args.wasm_dir) / f"{wasm_names.get(e['package'], e['package'].replace('-', '_'))}.wasm"
        if not wasm.is_file():
            print(f"missing: {wasm}", file=sys.stderr)
            failed = True
            continue
        size, limit = wasm.stat().st_size, e["max_wasm_bytes"]
        if size > limit:
            print(f"over budget: {e['package']} is {size} bytes, limit {limit}", file=sys.stderr)
            failed = True
        else:
            print(f"ok: {e['package']} {size}/{limit} bytes")
    return 1 if failed else 0


def cmd_validate(entries, args):
    known = workspace_wasm_names()
    bad = [e["package"] for e in entries if e["package"] not in known]
    for pkg in bad:
        print(f"unknown package in manifest: {pkg}", file=sys.stderr)
    return 1 if bad else 0


def cmd_list(entries, args):
    for e in entries:
        print(e["package"])
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check").add_argument("package")
    sg = sub.add_parser("size-gate")
    sg.add_argument("wasm_dir")
    sg.add_argument("--only", nargs="*")
    sub.add_parser("validate")
    sub.add_parser("list")
    args = parser.parse_args()
    entries = load(args.manifest)
    return {"check": cmd_check, "size-gate": cmd_size_gate, "validate": cmd_validate, "list": cmd_list}[args.cmd](entries, args)


if __name__ == "__main__":
    sys.exit(main())
