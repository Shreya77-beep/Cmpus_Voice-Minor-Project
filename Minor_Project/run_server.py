"""
CampusVoice Starter Script
Runs the FastAPI server with auto-reload and serves both the API and Web UI.
"""
import os
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
    is_cloud = any(os.getenv(k) for k in ("PORT", "RAILWAY_ENVIRONMENT", "RENDER", "FLY_APP_NAME", "DYNO"))
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print("=" * 60)
    print("  Starting CampusVoice: AI Campus Voice Assistant")
    print(f"  Listening on http://{host}:{port}")
    print(f"  API Documentation: http://127.0.0.1:{port}/docs")
    print("=" * 60)

    if not is_cloud and os.getenv("DISABLE_BROWSER", "").lower() not in ("1", "true"):
        threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=not is_cloud,
        reload_excludes=["*.db", "*.db-*", ".secret_key", "*.log"],
        proxy_headers=True,
        forwarded_allow_ips="*",
        app_dir=str(BACKEND_DIR),
    )
