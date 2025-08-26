# ArtGalleryCloud - Backend Python

Este es el backend en Python (FastAPI) que replica la funcionalidad del backend en Node.js.

## Tecnologías utilizadas

- **FastAPI**: Framework web moderno y rápido para construir APIs
- **PyMySQL**: Driver para conectar con MySQL
- **boto3**: SDK de AWS para almacenamiento S3
- **Uvicorn**: Servidor ASGI para ejecutar FastAPI
- **python-multipart**: Para manejar uploads de archivos
- **Pillow**: Para procesamiento de imágenes

## Estructura del proyecto

```
backend2/
├── src/
│   ├── __init__.py
│   ├── app.py              # Aplicación principal FastAPI
│   ├── db.py               # Conexión a base de datos
│   ├── routes/             # Rutas de la API
│   │   ├── __init__.py
│   │   ├── auth.py         # Autenticación (login/register)
│   │   ├── users.py        # Gestión de usuarios
│   │   ├── artworks.py     # Gestión de obras de arte
│   │   └── purchase.py     # Compras
│   └── storage/            # Sistema de almacenamiento
│       └── __init__.py     # Local y S3 storage
├── uploads/                # Archivos locales (si STORAGE_DRIVER=local)
├── main.py                 # Punto de entrada
├── requirements.txt        # Dependencias Python
├── .env                    # Variables de entorno
└── README.md              # Este archivo
```

## Instalación y configuración

### 1. Crear entorno virtual (recomendado)

```bash
cd backend2
python3 -m venv venv
source venv/bin/activate  # En Linux/Mac
# o
venv\Scripts\activate     # En Windows
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

Edita el archivo `.env` con tus credenciales:

```env
# --- App ---
NODE_ENV=development
PORT=8000

# --- Base de datos (RDS MySQL) ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=tu_password
DB_NAME=Semi_grupo_2322

# --- Almacenamiento S3 (opcional) ---
STORAGE_DRIVER=local  # o 's3'
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
S3_BUCKET_NAME=tu_bucket

# --- LOCAL STORAGE ---
LOCAL_UPLOAD_DIR=./uploads
```

### 4. Ejecutar el servidor

```bash
python main.py
```

O usando uvicorn directamente:

```bash
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints disponibles

La API estará disponible en `http://localhost:8000`

### Autenticación
- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Login

### Usuarios
- `GET /users/{id}` - Obtener perfil de usuario
- `POST /users/{id}/balance` - Agregar saldo
- `PUT /users/{id}` - Actualizar perfil
- `POST /users/{id}/photo` - Subir foto de perfil
- `GET /users/{id}/photo` - Obtener foto de perfil
- `GET /users/{id}/notifications` - Obtener notificaciones
- `PUT /users/{id}/notifications/{notif_id}/read` - Marcar notificación como leída

### Obras de arte
- `GET /artworks` - Listar obras públicas
- `GET /artworks/created?userId=X` - Obras creadas por un usuario
- `GET /artworks/mine?userId=X` - Inventario del usuario
- `POST /artworks/upload` - Subir nueva obra
- `GET /artworks/__debug` - Debug de almacenamiento

### Compras
- `POST /purchase` - Comprar obra de arte

### Otros
- `GET /health` - Health check
- `GET /` - Información de la API

## Documentación automática

FastAPI genera documentación automática:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Diferencias con el backend Node.js

1. **Framework**: FastAPI en lugar de Express.js
2. **Tipado**: Python con type hints vs JavaScript
3. **Async/await**: Soporte nativo en FastAPI
4. **Validación**: Pydantic models para validación automática
5. **Documentación**: Generación automática de OpenAPI/Swagger

## Funcionalidades implementadas

✅ Sistema de autenticación (registro/login)  
✅ Gestión de usuarios y perfiles  
✅ Upload de imágenes (local y S3)  
✅ CRUD de obras de arte  
✅ Sistema de compras  
✅ Notificaciones  
✅ Stored procedures de MySQL  
✅ Manejo de errores  
✅ CORS configurado  
✅ Archivos estáticos  

## Notas importantes

- El backend Python usa el puerto **8000** por defecto (vs 3000 del Node.js)
- Mantiene compatibilidad con la misma base de datos y stored procedures
- Usa la misma estructura de archivos para uploads
- Compatible con el mismo frontend React
