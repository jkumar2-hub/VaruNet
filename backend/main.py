"""
VaruNet FastAPI Application — Main Entry Point
SIH 2026 | PS 26067 | Ministry of Earth Sciences / INCOIS

Exposes the unified v3 application for:
- uvicorn main:app --port 8001 --reload
- uvicorn main_v3:app --port 8001 --reload
- python main.py
- python main_v3.py
"""
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main_v3 import app  # Unified v3 FastAPI application

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
