#!/usr/bin/env python3
"""
Ableton Auto-Launcher for macOS
Automatically opens an Ableton Live project, optionally verifying that
VSTs and sample directories are accessible before launching.
"""

import os
import sys
import glob
import time
import shutil
import argparse
import subprocess
from pathlib import Path


# ---------------------------------------------------------------------------
# Configuration — edit these to match your setup
# ---------------------------------------------------------------------------

CONFIG = {
    # Absolute path to your .als project file.
    # Example: "/Users/yourname/Music/Ableton/Projects/MyProject/MyProject.als"
    "project_file": "",

    # Ableton Live application path.  Leave empty to auto-detect.
    # Example: "/Applications/Ableton Live 11 Suite.app"
    "ableton_app": "",

    # List of VST/AU plug-in directories to verify before launching.
    # Leave empty to skip the check.
    "vst_dirs": [
        "/Library/Audio/Plug-Ins/VST",
        "/Library/Audio/Plug-Ins/VST3",
        "/Library/Audio/Plug-Ins/Components",
        os.path.expanduser("~/Library/Audio/Plug-Ins/VST"),
        os.path.expanduser("~/Library/Audio/Plug-Ins/VST3"),
        os.path.expanduser("~/Library/Audio/Plug-Ins/Components"),
    ],

    # Optional: list of specific VST/AU file names (without path) that must
    # be present.  Example: ["Serum.vst3", "Kontakt.vst3"]
    "required_plugins": [],

    # Optional: sample/sound library directories to verify.
    # Example: ["/Volumes/SampleDrive/Libraries"]
    "sample_dirs": [],

    # Seconds to wait after launching Ableton before the script exits.
    # 0 = don't wait.
    "wait_seconds": 0,
}

# ---------------------------------------------------------------------------


def find_ableton_app() -> str:
    """Return the path to the installed Ableton Live application."""
    candidates = sorted(
        glob.glob("/Applications/Ableton Live*.app"),
        reverse=True,          # prefer newer versions
    )
    if candidates:
        return candidates[0]
    raise FileNotFoundError(
        "Ableton Live not found in /Applications. "
        "Set CONFIG['ableton_app'] manually."
    )


def verify_plugins(vst_dirs: list, required_plugins: list) -> bool:
    """
    Check that plug-in directories exist and that every required plug-in
    is present in at least one of them.  Returns True if all checks pass.
    """
    ok = True

    for d in vst_dirs:
        if d and not os.path.isdir(d):
            print(f"  [warn] Plug-in directory not found: {d}")

    for plugin in required_plugins:
        found = any(
            os.path.exists(os.path.join(d, plugin))
            for d in vst_dirs
            if d and os.path.isdir(d)
        )
        if found:
            print(f"  [ok]   {plugin}")
        else:
            print(f"  [MISSING] {plugin}")
            ok = False

    return ok


def verify_sample_dirs(sample_dirs: list) -> bool:
    """Check that every listed sample/library directory is accessible."""
    ok = True
    for d in sample_dirs:
        if os.path.isdir(d):
            print(f"  [ok]   {d}")
        else:
            print(f"  [MISSING] {d}")
            ok = False
    return ok


def launch_ableton(ableton_app: str, project_file: str) -> None:
    """Open Ableton Live, optionally with a project file."""
    if project_file:
        cmd = ["open", "-a", ableton_app, project_file]
    else:
        cmd = ["open", "-a", ableton_app]

    print(f"\nLaunching: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Automatically launch an Ableton Live project on macOS."
    )
    parser.add_argument(
        "project",
        nargs="?",
        default=CONFIG["project_file"],
        help="Path to the .als project file (overrides CONFIG).",
    )
    parser.add_argument(
        "--ableton",
        default=CONFIG["ableton_app"],
        help="Path to Ableton Live .app (overrides CONFIG).",
    )
    parser.add_argument(
        "--skip-checks",
        action="store_true",
        help="Skip VST and sample-directory verification.",
    )
    parser.add_argument(
        "--wait",
        type=int,
        default=CONFIG["wait_seconds"],
        metavar="SECONDS",
        help="Wait N seconds after launching before exiting (default: 0).",
    )
    args = parser.parse_args()

    # ------------------------------------------------------------------
    # 1. Resolve Ableton app path
    # ------------------------------------------------------------------
    ableton_app = args.ableton or find_ableton_app()
    if not os.path.exists(ableton_app):
        print(f"Error: Ableton app not found at: {ableton_app}", file=sys.stderr)
        sys.exit(1)
    print(f"Ableton app : {ableton_app}")

    # ------------------------------------------------------------------
    # 2. Resolve project file
    # ------------------------------------------------------------------
    project_file = args.project
    if project_file:
        project_file = os.path.expanduser(project_file)
        if not os.path.isfile(project_file):
            print(f"Error: Project file not found: {project_file}", file=sys.stderr)
            sys.exit(1)
        print(f"Project file: {project_file}")
    else:
        print("Project file: (none — will open Ableton without a project)")

    # ------------------------------------------------------------------
    # 3. Pre-launch checks
    # ------------------------------------------------------------------
    if not args.skip_checks:
        all_ok = True

        if CONFIG["required_plugins"] or CONFIG["vst_dirs"]:
            print("\nChecking plug-ins …")
            if not verify_plugins(CONFIG["vst_dirs"], CONFIG["required_plugins"]):
                all_ok = False

        if CONFIG["sample_dirs"]:
            print("\nChecking sample libraries …")
            if not verify_sample_dirs(CONFIG["sample_dirs"]):
                all_ok = False

        if not all_ok:
            print(
                "\nOne or more required resources are missing. "
                "Launch anyway? [y/N] ",
                end="",
                flush=True,
            )
            if input().strip().lower() != "y":
                print("Aborted.")
                sys.exit(1)

    # ------------------------------------------------------------------
    # 4. Launch
    # ------------------------------------------------------------------
    launch_ableton(ableton_app, project_file)

    if args.wait > 0:
        print(f"Waiting {args.wait}s …")
        time.sleep(args.wait)

    print("Done.")


if __name__ == "__main__":
    main()
