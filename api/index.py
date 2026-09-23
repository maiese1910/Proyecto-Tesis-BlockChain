import os
import sys

# Asegurar que el directorio de la API está en el PYTHONPATH de Vercel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app

__all__ = ["app"]
