from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import hashlib
from typing import Optional
from ..db import db
from ..storage import get_storage

router = APIRouter()
storage = get_storage()

class BalanceRequest(BaseModel):
    amount: float

class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    new_password: Optional[str] = None
    current_password: str

def md5_hash(text: str) -> str:
    """Genera hash MD5 de 16 caracteres"""
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:16]

@router.get("/{user_id}")
async def get_user_profile(user_id: int):
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuario inválido")

        result = await db.execute_procedure('sp_get_user_profile', [user_id])
        
        if not result:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        return result[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"GET /users/{user_id} error: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener el perfil")

@router.post("/{user_id}/balance")
async def add_balance(user_id: int, request: BalanceRequest):
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuario inválido")
        
        if not request.amount or request.amount <= 0:
            raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

        result = await db.execute_procedure('sp_add_balance', [user_id, request.amount])
        
        if not result:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Enviar notificación
        await db.execute_procedure('sp_notify', [
            user_id,
            'system',
            'Saldo recargado',
            f'Se acreditó Q{request.amount:.2f} a tu cuenta.'
        ])

        return {
            "ok": True,
            "balance": result[0].get('new_balance', result[0].get('balance'))
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"POST /users/{user_id}/balance error: {e}")
        raise HTTPException(status_code=500, detail="No se pudo actualizar el saldo")

@router.put("/{user_id}")
async def update_profile(user_id: int, request: UpdateProfileRequest):
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuario inválido")
        
        if not request.current_password:
            raise HTTPException(status_code=400, detail="Contraseña actual es requerida")

        # Normalizar valores opcionales
        username = request.username.strip() if request.username else None
        full_name = request.full_name.strip() if request.full_name else None
        new_hash = md5_hash(request.new_password) if request.new_password else None
        current_hash = md5_hash(request.current_password)

        result = await db.execute_procedure('sp_update_user_profile', [
            user_id, username, full_name, new_hash, current_hash
        ])

        if not result:
            raise HTTPException(status_code=500, detail="Error al actualizar perfil")

        status = result[0].get('status')
        
        if status == 'INVALID_PASSWORD':
            raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")
        elif status == 'USERNAME_DUP':
            raise HTTPException(status_code=409, detail="El nombre de usuario ya existe")
        elif status == 'NOT_FOUND':
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        elif status == 'NO_CHANGES':
            return {"ok": True, "message": "No se detectaron cambios"}

        # Enviar notificación
        await db.execute_procedure('sp_notify', [
            user_id,
            'system',
            'Perfil actualizado',
            'Tus datos de perfil fueron actualizados.'
        ])

        return {"ok": True}

    except HTTPException:
        raise
    except Exception as e:
        print(f"PUT /users/{user_id} error: {e}")
        raise HTTPException(status_code=500, detail="No se pudo editar el perfil")

@router.post("/{user_id}/photo")
async def upload_photo(user_id: int, image: UploadFile = File(...)):
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuario inválido")
        
        if not image:
            raise HTTPException(status_code=400, detail="No se proporcionó imagen")

        # Subir imagen
        image_content = await image.read()
        key = await storage.upload(
            buffer=image_content,
            mime_type=image.content_type,
            folder="Fotos_Perfil",
            name_base=f"u_{user_id}"
        )

        # Guardar en BD
        result = await db.execute_procedure('sp_set_user_photo', [user_id, key])
        
        if result and result[0].get('status') == 'NOT_FOUND':
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Enviar notificación
        await db.execute_procedure('sp_notify', [
            user_id,
            'system',
            'Foto de perfil actualizada',
            'Tu foto de perfil se actualizó correctamente.'
        ])

        return {
            "ok": True,
            "photo_key": key,
            "public_url": storage.public_url_from_key(key)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"POST /users/{user_id}/photo error: {e}")
        raise HTTPException(status_code=500, detail="No se pudo actualizar la foto")

@router.get("/{user_id}/photo")
async def get_user_photo(user_id: int):
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuario inválido")

        result = await db.execute_procedure('sp_get_user_photo', [user_id])
        
        if not result or not result[0].get('photo_url'):
            raise HTTPException(status_code=404, detail="Foto no encontrada")

        photo_key = result[0]['photo_url']
        public_url = storage.public_url_from_key(photo_key)
        
        return RedirectResponse(url=public_url)

    except HTTPException:
        raise
    except Exception as e:
        print(f"GET /users/{user_id}/photo error: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener la foto")

@router.get("/{user_id}/notifications")
async def get_notifications(user_id: int):
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="ID de usuario inválido")

        result = await db.execute_procedure('sp_get_notifications', [user_id])
        return result

    except Exception as e:
        print(f"GET /users/{user_id}/notifications error: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener notificaciones")

@router.put("/{user_id}/notifications/{notif_id}/read")
async def mark_notification_read(user_id: int, notif_id: int):
    try:
        if not user_id or not notif_id:
            raise HTTPException(status_code=400, detail="IDs inválidos")

        await db.execute_procedure('sp_mark_notification_read', [user_id, notif_id])
        return {"ok": True}

    except Exception as e:
        print(f"PUT /users/{user_id}/notifications/{notif_id}/read error: {e}")
        raise HTTPException(status_code=500, detail="Error al marcar notificación")
