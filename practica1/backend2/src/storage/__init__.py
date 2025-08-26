import os
import time
from abc import ABC, abstractmethod
import aiofiles
import boto3
from botocore.exceptions import ClientError

class StorageInterface(ABC):
    @abstractmethod
    async def upload(self, buffer: bytes, mime_type: str, folder: str, name_base: str) -> str:
        pass
    
    @abstractmethod
    def public_url_from_key(self, key: str) -> str:
        pass

class LocalStorage(StorageInterface):
    def __init__(self):
        self.base_dir = os.getenv('LOCAL_UPLOAD_DIR', './uploads')
        os.makedirs(self.base_dir, exist_ok=True)

    async def upload(self, buffer: bytes, mime_type: str, folder: str, name_base: str) -> str:
        # Determinar extensión del archivo
        ext = self._get_extension_from_mime(mime_type)
        
        # Crear directorio si no existe
        dir_path = os.path.join(self.base_dir, folder)
        os.makedirs(dir_path, exist_ok=True)
        
        # Generar nombre único
        filename = f"{name_base}-{int(time.time() * 1000)}.{ext}"
        file_path = os.path.join(dir_path, filename)
        
        # Guardar archivo
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(buffer)
        
        # Retornar key (ruta relativa)
        return f"{folder}/{filename}"

    def public_url_from_key(self, key: str) -> str:
        return f"/static/{key}"

    def _get_extension_from_mime(self, mime_type: str) -> str:
        mime_map = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg'
        }
        return mime_map.get(mime_type, 'bin')

class S3Storage(StorageInterface):
    def __init__(self):
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.bucket = os.getenv('S3_BUCKET_NAME')
        if not self.bucket:
            raise ValueError("S3_BUCKET_NAME no está definido en el entorno")
        
        self.client = boto3.client('s3', region_name=self.region)
        self.use_public_acl = os.getenv('S3_USE_PUBLIC_READ_ACL', '').lower() == 'true'
        self.cdn_domain = os.getenv('CDN_DOMAIN')

    async def upload(self, buffer: bytes, mime_type: str, folder: str, name_base: str) -> str:
        ext = self._get_extension_from_mime(mime_type)
        filename = f"{name_base}-{int(time.time() * 1000)}.{ext}"
        key = f"{folder}/{filename}"

        put_params = {
            'Bucket': self.bucket,
            'Key': key,
            'Body': buffer,
            'ContentType': mime_type or 'application/octet-stream',
            'CacheControl': 'public, max-age=31536000, immutable'
        }

        if self.use_public_acl:
            put_params['ACL'] = 'public-read'

        try:
            self.client.put_object(**put_params)
            return key
        except ClientError as e:
            raise Exception(f"Error uploading to S3: {e}")

    def public_url_from_key(self, key: str) -> str:
        if self.cdn_domain:
            return f"https://{self.cdn_domain}/{key}"
        
        if self.region == 'us-east-1':
            host = 's3.amazonaws.com'
        else:
            host = f's3.{self.region}.amazonaws.com'
        
        return f"https://{self.bucket}.{host}/{key}"

    def _get_extension_from_mime(self, mime_type: str) -> str:
        if not mime_type:
            return 'bin'
        
        mime = mime_type.lower()
        if 'jpeg' in mime:
            return 'jpg'
        elif 'png' in mime:
            return 'png'
        elif 'gif' in mime:
            return 'gif'
        elif 'webp' in mime:
            return 'webp'
        elif 'svg' in mime:
            return 'svg'
        else:
            return mime.split('/')[1] if '/' in mime else 'bin'

# Storage factory
_storage_instance = None

def get_storage() -> StorageInterface:
    global _storage_instance
    if _storage_instance is None:
        driver = os.getenv('STORAGE_DRIVER', 'local')
        if driver == 's3':
            _storage_instance = S3Storage()
        else:
            _storage_instance = LocalStorage()
    return _storage_instance
