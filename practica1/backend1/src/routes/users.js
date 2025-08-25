// src/routes/users.js
import express from "express";
import crypto from "crypto";
import multer from "multer";
import { pool } from "../db.js";
import { getStorage } from "../storage/index.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const storage = getStorage();

function md5(text) {
    return crypto.createHash("md5").update(text, "utf8").digest("hex");
}

// GET /users/:id  → perfil (id, username, full_name, balance, photo_url?)
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });

        // sp_get_user_profile debe retornar una fila con las columnas necesarias.
        const [rs] = await pool.query("CALL sp_get_user_profile(?)", [id]);
        // NOTA mysql2 con CALL retorna [ [rows], [sp_meta], ...]. Nos quedamos con el primer recordset:
        const rows = rs?.[0] ?? rs;
        if (!rows || !rows.length) {
            return res.status(404).json({ error: "Usuario no existe" });
        }
        return res.json(rows[0]);
    } catch (e) {
        console.error("GET /users/:id error:", e);
        return res.status(500).json({ error: "Error al obtener el perfil" });
    }
});

// POST /users/:id/balance  { amount }
router.post("/:id/balance", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const amount = Number(req.body?.amount);
        if (!id) return res.status(400).json({ error: "id inválido" });
        if (!amount || isNaN(amount) || amount <= 0) {
            return res
                .status(400)
                .json({ error: "amount debe ser un número > 0" });
        }

        // sp_add_balance debe validar existencia de usuario y devolver el nuevo saldo
        const [rs] = await pool.query("CALL sp_add_balance(?, ?)", [
            id,
            amount,
        ]);
        const rows = rs?.[0] ?? rs;
        if (!rows || !rows.length) {
            return res.status(404).json({ error: "Usuario no existe" });
        }

        await pool.query("CALL sp_notify(?, ?, ?, ?)", [
            id,
            "system",
            "Saldo recargado",
            `Se acreditó Q${Number(amount).toFixed(2)} a tu cuenta.`,
        ]);

        // asumo columna new_balance
        return res.json({
            ok: true,
            balance: rows[0].new_balance ?? rows[0].balance,
        });
    } catch (e) {
        console.error("POST /users/:id/balance error:", e);
        return res
            .status(500)
            .json({ error: "No se pudo actualizar el saldo" });
    }
});

// PUT /users/:id  { username?, full_name?, new_password?, current_password }
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });

        const { username, full_name, new_password, current_password } =
            req.body || {};
        if (!current_password) {
            return res
                .status(400)
                .json({ error: "current_password es requerido" });
        }

        // Normalizamos valores opcionales: pasar null cuando no se quiere cambiar
        const u = (username && String(username).trim()) || null;
        const f = (full_name && String(full_name).trim()) || null;
        const newHash =
            new_password && String(new_password).trim()
                ? md5(new_password).slice(0, 16)
                : null;
        const currentHash = md5(String(current_password)).slice(0, 16);

        // El SP debe: validar current_password, aplicar cambios recibidos != null, y
        // devolver un resultado que podamos interpretar (por ejemplo { ok: 1 }).
        const [rs] = await pool.query(
            "CALL sp_update_user_profile(?, ?, ?, ?, ?)",
            [id, u, f, newHash, currentHash]
        );
        const rows = rs?.[0] ?? rs;

        // Convenciones cómodas:
        // - Si SP retorna { status: 'INVALID_PASSWORD' } → 401
        // - Si SP retorna { status: 'USERNAME_DUP' } → 409
        // - Si SP retorna { status: 'NOT_FOUND' } → 404
        // - Si SP retorna { status: 'OK' } → 200
        const r = rows && rows[0];

        if (!r)
            return res.status(500).json({ error: "Respuesta inválida del SP" });

        if (r.status === "INVALID_PASSWORD") {
            return res
                .status(401)
                .json({ error: "Contraseña actual incorrecta" });
        }
        if (r.status === "USERNAME_DUP") {
            return res
                .status(409)
                .json({ error: "Nombre de usuario ya está en uso" });
        }
        if (r.status === "NOT_FOUND") {
            return res.status(404).json({ error: "Usuario no existe" });
        }
        // Si no hubo cambios, deja mensaje amigable
        if (r.status === "NO_CHANGES") {
            return res.json({
                ok: true,
                message: "No hay cambios para aplicar",
            });
        }

        await pool.query("CALL sp_notify(?, ?, ?, ?)", [
            id,
            "system",
            "Perfil actualizado",
            "Tus datos de perfil fueron actualizados.",
        ]);

        return res.json({ ok: true });
    } catch (e) {
        // Si no manejamos el dup aquí, el SP ya lo debe haber expresado como USERNAME_DUP.
        console.error("PUT /users/:id error:", e);
        return res.status(500).json({ error: "No se pudo editar el perfil" });
    }
});

// POST /users/:id/photo  (multipart form-data con 'image')
router.post("/:id/photo", upload.single("image"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });
        if (!req.file)
            return res.status(400).json({ error: "image es requerido" });

        // Subimos primero al storage para obtener la KEY
        const key = await storage.upload({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            folder: "Fotos_Perfil",
            nameBase: `u_${id}`,
        });

        // Guardamos la key en DB vía SP (valida existencia de user)
        const [rs] = await pool.query("CALL sp_set_user_photo(?, ?)", [
            id,
            key,
        ]);
        const rows = rs?.[0] ?? rs;
        const r = rows && rows[0];

        if (r?.status === "NOT_FOUND") {
            return res.status(404).json({ error: "Usuario no existe" });
        }

        await pool.query("CALL sp_notify(?, ?, ?, ?)", [
            id,
            "system",
            "Foto de perfil actualizada",
            "Tu foto de perfil se actualizó correctamente.",
        ]);

        return res.json({
            ok: true,
            photo_key: key,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(key)
                : key,
        });
    } catch (e) {
        console.error("POST /users/:id/photo error:", e);
        return res
            .status(500)
            .json({ error: "No se pudo actualizar la foto de perfil" });
    }
});

// GET /users/:id/photo  → 302 a la URL pública
router.get("/:id/photo", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });

        const [rs] = await pool.query("CALL sp_get_user_photo(?)", [id]);
        const rows = rs?.[0] ?? rs;
        if (!rows || !rows.length)
            return res.status(404).json({ error: "Usuario no existe" });

        const key = rows[0].photo_url;
        if (!key) return res.status(404).json({ error: "Usuario sin foto" });

        const url = storage.publicUrlFromKey
            ? storage.publicUrlFromKey(key)
            : key;
        return res.redirect(302, url);
    } catch (e) {
        console.error("GET /users/:id/photo error:", e);
        return res.status(500).json({ error: "No se pudo obtener la foto" });
    }
});

// GET /users/:id/notifications
router.get("/:id/notifications", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });

        const [rs] = await pool.query("CALL sp_get_notifications(?)", [id]);
        const rows = rs?.[0] ?? rs;
        return res.json(rows || []);
    } catch (e) {
        console.error("GET /users/:id/notifications error:", e);
        return res
            .status(500)
            .json({ error: "No se pudieron obtener las notificaciones" });
    }
});

// PUT /users/:id/notifications/:notifId/read
router.put("/:id/notifications/:notifId/read", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const notifId = Number(req.params.notifId);
        if (!id || !notifId)
            return res.status(400).json({ error: "parámetros inválidos" });

        const [rs] = await pool.query("CALL sp_mark_notification_read(?, ?)", [
            id,
            notifId,
        ]);
        const rows = rs?.[0] ?? rs;
        const r = rows && rows[0];

        if (r?.status === "NOT_FOUND") {
            return res.status(404).json({ error: "No encontrada" });
        }
        return res.json({ ok: true });
    } catch (e) {
        console.error("PUT /users/:id/notifications/:notifId/read error:", e);
        return res
            .status(500)
            .json({ error: "No se pudo actualizar la notificación" });
    }
});

export default router;
