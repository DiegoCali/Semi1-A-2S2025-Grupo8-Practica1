from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from dotenv import load_dotenv

# Importar rutas
from .routes import auth, users, artworks, purchase

# Cargar variables de entorno
load_dotenv()

# Crear aplicación FastAPI
app = FastAPI(
    title="ArtGalleryCloud API",
    description="API para galería de arte - Backend en Python",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar archivos estáticos
upload_dir = os.getenv('LOCAL_UPLOAD_DIR', './uploads')
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=upload_dir), name="static")

# Registrar rutas
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(artworks.router, prefix="/artworks", tags=["Artworks"])
app.include_router(purchase.router, prefix="/purchase", tags=["Purchase"])

# Endpoint de salud
@app.get("/health")
async def health_check():
    return {"ok": True}

# Endpoint raíz
@app.get("/")
async def root():
    return {
        "message": "ArtGalleryCloud API - Python Backend",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv('NODE_ENV') != 'production' else False
    )
