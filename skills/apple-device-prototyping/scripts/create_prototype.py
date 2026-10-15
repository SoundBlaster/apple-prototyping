#!/usr/bin/env python3
"""Copy the self-contained starter into a new, non-existing directory."""
from pathlib import Path
import argparse
import shutil

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination",type=Path)
    args=parser.parse_args()
    destination=args.destination.expanduser().resolve()
    if destination.exists():
        parser.error("Destination already exists; choose a new directory. Existing work is never overwritten.")
    starter=Path(__file__).resolve().parents[1]/"assets/starter"
    # Local device exports belong to the current prototype, not every new client project.
    shutil.copytree(starter,destination,ignore=shutil.ignore_patterns("captures"))
    print(f"Created {destination}")
    print(f"Serve with: python3 -m http.server 8000 --directory '{destination}'")

if __name__=="__main__":main()
