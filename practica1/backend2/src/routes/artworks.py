from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional
from ..db import db
from ..storage import get_storage

router = APIRouter()
storage = get_storage()

@router.get("/")
async def list_artworks(
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Lista pública de obras con paginación"""
    try:
        result = await db.execute_procedure('sp_artworks_list', [limit, offset])
        
        data = []
        for artwork in result:
            data.append({
                "id": artwork['id'],
                "name": artwork['name'],
                "image_name": artwork['image_name'],
                "url_key": artwork['url'],
                "price": artwork['price'],
                "is_available": bool(artwork['is_available']),
                "seller_id": artwork['seller_id'],
                "seller": artwork['seller'],
                "public_url": storage.public_url_from_key(artwork['url'])
            })

        return data

    except Exception as e:
        print(f"GET /artworks error: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron listar las obras")

@router.get("/created")
async def get_created_artworks(
    userId: int = Query(...),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Obras creadas por un autor (paginado)"""
    try:
        if not userId:
            raise HTTPException(status_code=400, detail="userId es requerido")

        result = await db.execute_procedure('sp_artworks_created', [userId, limit, offset])
        
        data = []
        for artwork in result:
            public_url = storage.public_url_from_key(artwork['url'])
            data.append({
                "id": artwork['id'],
                "name": artwork['name'],
                "image_name": artwork['image_name'],
                "url_key": artwork['url'],
                "price": artwork['price'],
                "is_available": bool(artwork['is_available']),
                "acquisition_type": artwork['acquisition_type'],
                "original_owner_id": artwork['original_owner_id'],
                "seller": artwork['original_owner_full_name'],
                "current_owner_id": artwork['current_owner_id'],
                "current_owner_full_name": artwork['current_owner_full_name'],
                "created_at": artwork['created_at'],
                "updated_at": artwork['updated_at'],
                "public_url": public_url
            })

        return data

    except HTTPException:
        raise
    except Exception as e:
        print(f"GET /artworks/created error: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron obtener las obras creadas")

@router.get("/mine")
async def get_my_artworks(userId: int = Query(...)):
    """Inventario del usuario"""
    try:
        if not userId:
            raise HTTPException(status_code=400, detail="userId es requerido")

        result = await db.execute_procedure('sp_artworks_mine', [userId])
        
        data = []
        for artwork in result:
            public_url = storage.public_url_from_key(artwork['url'])
            data.append({
                "id": artwork['id'],
                "name": artwork['name'],
                "image_name": artwork['image_name'],
                "url_key": artwork['url'],
                "price": artwork['price'],
                "is_available": bool(artwork['is_available']),
                "acquisition_type": artwork['acquisition_type'],
                "seller_id": artwork['original_owner_id'],
                "seller": artwork['original_owner_full_name'],
                "public_url": public_url
            })

        return data

    except HTTPException:
        raise
    except Exception as e:
        print(f"GET /artworks/mine error: {e}")
        raise HTTPException(status_code=500, detail="No se pudo obtener el inventario")

@router.post("/upload")
async def upload_artwork(
    userId: int = Form(...),
    name: str = Form(...),
    price: float = Form(default=0),
    image: UploadFile = File(...)
):
    """Subir nueva obra de arte"""
    try:
        if not userId:
            raise HTTPException(status_code=400, detail="userId es requerido")
        
        if not image:
            raise HTTPException(status_code=400, detail="Imagen es requerida")
        
        if price < 0:
            raise HTTPException(status_code=400, detail="El precio no puede ser negativo")
        
        name = name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre es requerido")
        
        if len(name) > 255:
            raise HTTPException(status_code=400, detail="El nombre es muy largo")

        # 1) Subir imagen
        image_content = await image.read()
        key = await storage.upload(
            buffer=image_content,
            mime_type=image.content_type,
            folder="Fotos_Publicadas",
            name_base=f"art_{userId}"
        )

        # 2) Guardar en BD
        result = await db.execute_procedure('sp_artwork_publish', [
            userId, name, price, key
        ])

        new_id = None
        if result:
            new_id = (result[0].get('id') or 
                     result[0].get('insert_id') or 
                     result[0].get('LAST_INSERT_ID'))

        # 3) Enviar notificación
        await db.execute_procedure('sp_notify', [
            userId,
            'system',
            'Obra publicada',
            f'Publicaste "{name}" por Q{price:.2f}.'
        ])

        return {
            "id": new_id,
            "name": name,
            "url_key": key,
            "public_url": storage.public_url_from_key(key),
            "price": price
        }

    except HTTPException:
        raise
    except Exception as e:
        if 'Duplicate entry' in str(e):
            raise HTTPException(status_code=409, detail="Ya existe una obra con ese nombre")
        print(f"POST /artworks/upload error: {e}")
        raise HTTPException(status_code=500, detail="No se pudo publicar la obra")

@router.get("/__debug")
async def debug_storage():
    """Endpoint de debug para verificar configuración de almacenamiento"""
    try:
        import os
        driver = os.getenv('STORAGE_DRIVER', 'local')
        local_dir = os.getenv('LOCAL_UPLOAD_DIR', './uploads')
        
        return {
            "driver": driver,
            "localDir": local_dir,
            "staticMount": "/static"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="debug failed")
