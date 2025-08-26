from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import hashlib
from typing import Optional
from ..db import db
from ..storage import get_storage

router = APIRouter()
storage = get_storage()

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    full_name: str
    password: str

def md5_hash(text: str) -> str:
    """Genera hash MD5 de 16 caracteres"""
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:16]

@router.post("/register")
async def register(
    username: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    try:
        if not username or not full_name or not password:
            raise HTTPException(
                status_code=400,
                detail="username, full_name y password son obligatorios"
            )

        hash16 = md5_hash(password)

        # 1) Crear usuario vía SP
        try:
            result = await db.execute_procedure('sp_user_create', [
                username.strip(),
                full_name.strip(),
                hash16
            ])
            user_id = result[0]['id'] if result else None
        except Exception as e:
            if 'Duplicate entry' in str(e):
                raise HTTPException(status_code=409, detail="Usuario ya existe")
            raise HTTPException(status_code=500, detail="No se pudo registrar")

        # 2) Si hay imagen, subir y guardar KEY
        photo_key = None
        if image:
            try:
                image_content = await image.read()
                photo_key = await storage.upload(
                    buffer=image_content,
                    mime_type=image.content_type,
                    folder="Fotos_Perfil",
                    name_base=f"u_{user_id}"
                )
                await db.execute_procedure('sp_user_set_photo', [user_id, photo_key])
            except Exception as err:
                print(f"REGISTER_PHOTO_UPLOAD_ERROR: {err}")

        # 3) Enviar notificación de bienvenida
        await db.execute_procedure('sp_notify', [
            user_id,
            'system',
            '¡Bienvenido a ArtGalleryCloud!',
            f'Hola {full_name.strip()}, tu cuenta fue creada correctamente.'
        ])

        response = {
            "ok": True,
            "id": user_id,
            "username": username.strip(),
            "full_name": full_name.strip(),
            "balance": "0.00"
        }

        if photo_key:
            response.update({
                "photo_key": photo_key,
                "public_url": storage.public_url_from_key(photo_key)
            })
        elif image:
            response["warning"] = "La imagen no se pudo guardar; el usuario se creó sin foto."

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTER_ERROR: {e}")
        raise HTTPException(status_code=500, detail="No se pudo registrar")

@router.post("/login")
async def login(request: LoginRequest):
    try:
        if not request.username or not request.password:
            raise HTTPException(status_code=400, detail="Faltan campos")

        hash16 = md5_hash(request.password)
        result = await db.execute_procedure('sp_auth_login', [
            request.username,
            hash16
        ])

        if not result:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")

        return result[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN_ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal error")
