"""
AdherePulse Launcher
Initializes the database, loads seed clinical cohorts, and launches the FastAPI server.
"""

import os
import sys
import uvicorn

# Ensure backend is in python path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from seed_data import populate_seed_data
from models import init_db

def main():
    print("=" * 60)
    print("  AdherePulse — Latent Adherence Inference Engine")
    print("  Built for Manipal Hackathon 2026")
    print("=" * 60)
    print("[1/3] Initializing SQLite database...")
    init_db()

    print("[2/3] Seeding clinical cohorts and baseline ML inference...")
    populate_seed_data()

    print("[3/3] Starting FastAPI Web Server at http://localhost:8000 ...")
    print("Open http://localhost:8000 in your browser to view the dashboard.")
    print("Press Ctrl+C to stop.")
    
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False, app_dir=backend_path)

if __name__ == "__main__":
    main()
