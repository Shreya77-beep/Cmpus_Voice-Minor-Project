"""
CampusVoice Root Starter Script
Delegates to Minor_Project/run_server.py
"""
import sys
from pathlib import Path
import subprocess

if __name__ == "__main__":
    minor_dir = Path(__file__).resolve().parent / "Minor_Project"
    script = minor_dir / "run_server.py"
    subprocess.run([sys.executable, str(script)], cwd=str(minor_dir))
