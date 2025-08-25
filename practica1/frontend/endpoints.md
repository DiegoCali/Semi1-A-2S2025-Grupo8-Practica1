Resumen de endpoints (Backend 1)
Salud

GET /health
Req: —
Res: { "ok": true }

Autenticación

POST /auth/register
Body (JSON): { "username": string, "full_name": string, "password": string }
Res: { "ok": true }
(password se guarda como MD5 hex recortado a 16 en DB)

POST /auth/login
Body (JSON): { "username": string, "password": string }
Res: { "id": number, "username": string, "full_name": string, "balance": "0.00" }

Artworks

GET /artworks?limit=&offset=
Req: query opcional: limit, offset
Res: [{ id, url, price, is_available, seller_id, seller, public_url }]
(public_url apunta a /static/... en local o al S3/CDN en prod)

GET /artworks/mine?userId=
Req: query userId (número)
Res: [{ id, url, price, is_available, acquisition_type, public_url }]

POST /artworks/upload
Body (multipart/form-data):

image (archivo)

userId (dueño inicial)

price (>= 0)
Res: { id, url_key, public_url, price }
(en DB se guarda solo la key relativa: Fotos_Publicadas/...)

Purchase

POST /purchase
Body (JSON): { "buyerId": number, "artworkId": number }
Res: { ok: true, artworkId, buyerId, sellerId, price }
(mueve saldos, transfiere propiedad, marca no disponible; notificaciones por triggers en DB)

Users

GET /users/:id
Res: { id, username, full_name, balance, (photo_url?) }

POST /users/:id/balance
Body (JSON): { "amount": number>0 }
Res: { ok: true, balance }
(dispara notificación de “Saldo recargado” por trigger)

PUT /users/:id
Body (JSON):

cambios opcionales: username?, full_name?, new_password?

obligatorio: current_password (para validar)
Res: { ok: true } (o “No hay cambios”)

POST /users/:id/photo
Body (multipart/form-data): image
Res: { ok: true, photo_key, public_url }
(requiere columna photo_url en users; guarda key en DB, archivo a Local/S3)

Notificaciones (opcionales que agregamos)

GET /users/:id/notifications
Res: [{ id, type, title, body, is_read, created_at }]

PUT /users/:id/notifications/:notifId/read
Res: { ok: true }

⚙️ Triggers en DB: crean notificaciones en 1) registro (bienvenida), 2) publicar obra, 3) compra (comprador/vendedor) y 4) recarga de saldo, 5) edición de perfi