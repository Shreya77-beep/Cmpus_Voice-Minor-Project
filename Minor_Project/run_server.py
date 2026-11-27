"""
CampusVoice Starter Script
Runs the FastAPI server with auto-reload and serves both the API and Web UI.
"""
import sys
import webbrowser
import time
import threading
from pathlib import Path

# Add backend directory to sys.path so 'app' imports resolve cleanly
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import uvicorn

def open_browser():
    time.sleep(1.8)
    print("\n[CampusVoice] Opening Web Assistant in browser: http://127.0.0.1:8000")
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    print("=" * 60)
    print("  🎙️  Starting CampusVoice: AI Campus Voice Assistant")
    print("  🌐  Web App & UI: http://127.0.0.1:8000")
    print("  📖  API Documentation: http://127.0.0.1:8000/docs")
    print("=" * 60)

    # Launch browser automatically
    threading.Thread(target=open_browser, daemon=True).start()

    # Start FastAPI / Uvicorn server on all interfaces (0.0.0.0) so mobile QR / LAN devices can connect
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=["*.db", "*.db-*", ".secret_key", "*.log"],
        app_dir=str(BACKEND_DIR),
    )
