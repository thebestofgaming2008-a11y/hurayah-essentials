import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Import the FastAPI app
from server import app

# Vercel entry point
from mangum import Mangum

handler = Mangum(app)
