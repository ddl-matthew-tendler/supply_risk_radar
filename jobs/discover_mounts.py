"""Discover where (if anywhere) the NetApp volume is mounted inside this Job pod.

Prints every candidate path so we can figure out the correct SRR_VOLUME_ROOT.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, timeout=10)
    except Exception as e:
        return f"<error: {e}>"


def main() -> int:
    print("=== /mnt ===", flush=True)
    print(run(["ls", "-la", "/mnt"]))

    for candidate in ("/mnt/netapp-volumes", "/domino", "/domino/netapp-volumes",
                      "/domino-netapp-volumes", "/var/netapp", "/netapp"):
        print(f"=== {candidate} ===", flush=True)
        print(run(["ls", "-la", candidate]))

    print("=== mount | grep -i netapp ===", flush=True)
    try:
        out = subprocess.check_output("mount", text=True, stderr=subprocess.STDOUT)
        for line in out.splitlines():
            if any(kw in line.lower() for kw in ("netapp", "nfs", "supply")):
                print(line)
    except Exception as e:
        print(f"<mount error: {e}>")

    print("=== env (NET|MOUNT|VOLUME|DOMINO) ===", flush=True)
    for k, v in sorted(os.environ.items()):
        if any(kw in k.upper() for kw in ("NET", "MOUNT", "VOLUME")):
            print(f"{k}={v}")

    print("=== find / -maxdepth 4 -name 'Supply*' ===", flush=True)
    print(run(["bash", "-c", "find / -maxdepth 4 -name 'Supply*' 2>/dev/null"]))

    print("=== find / -maxdepth 4 -type d -name '*netapp*' ===", flush=True)
    print(run(["bash", "-c", "find / -maxdepth 4 -type d -iname '*netapp*' 2>/dev/null"]))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
