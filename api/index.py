import sys
from pathlib import Path

# The app lives in backend/, outside Vercel's import path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
