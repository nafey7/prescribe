#!/usr/bin/env python3
"""CLI wrapper: remove dev seed data from MongoDB.

  cd backend && PYTHONPATH=. python scripts/deseed.py

Equivalent to: python -m app.scripts.deseed
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.scripts.deseed import main  # noqa: E402

if __name__ == "__main__":
    print("Removing development seed data…\n")
    main()
