#!/usr/bin/env python3
"""
Punto de entrada principal para el backend Python de ArtGalleryCloud
"""
import os
import sys
import uvicorn
from dotenv import load_dotenv

# Añadir el directorio actual al path para poder importar src
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Cargar variables de entorno
load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    env = os.getenv('NODE_ENV', 'development')
    
    print(f"🚀 Iniciando ArtGalleryCloud Python Backend en puerto {port}")
    print(f"🌍 Entorno: {env}")
    
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=port,
        reload=env != 'production',
        log_level="info"
    )
