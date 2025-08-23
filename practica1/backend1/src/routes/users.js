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

let PHOTO_COL_EXISTS = null;
async function ensurePhotoColumnExists() {
    if (PHOTO_COL_EXISTS !== null) return PHOTO_COL_EXISTS;
    const [rows] = await pool.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_url'`,
        [process.env.DB_NAME]
    );
    PHOTO_COL_EXISTS = rows.length > 0;
    return PHOTO_COL_EXISTS;
}

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });

        const hasPhoto = await ensurePhotoColumnExists();
        const fields = hasPhoto
            ? "id, username, full_name, balance, photo_url"
            : "id, username, full_name, balance";

        const [rows] = await pool.query(
            `SELECT ${fields} FROM users WHERE id = ?`,
            [id]
        );
        if (!rows.length)
            return res.status(404).json({ error: "Usuario no existe" });

        res.json(rows[0]);
    } catch (e) {
        console.error("GET /users/:id error:", e);
        res.status(500).json({ error: "Error al obtener el perfil" });
    }
});

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

        const [result] = await pool.query(
            `UPDATE users SET balance = balance + ? WHERE id = ?`,
            [amount, id]
        );
        if (!result.affectedRows)
            return res.status(404).json({ error: "Usuario no existe" });

        const [[user]] = await pool.query(
            `SELECT id, username, full_name, balance FROM users WHERE id=?`,
            [id]
        );
        res.json({ ok: true, balance: user.balance });
    } catch (e) {
        console.error("POST /users/:id/balance error:", e);
        res.status(500).json({ error: "No se pudo actualizar el saldo" });
    }
});

router.put("/:id", async (req, res) => {
    let conn;
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

        const currentHash = md5(current_password).slice(0, 16);
        const [[u]] = await pool.query(
            `SELECT id FROM users WHERE id = ? AND password_hash = ?`,
            [id, currentHash]
        );
        if (!u)
            return res
                .status(401)
                .json({ error: "Contraseña actual incorrecta" });

        const sets = [];
        const vals = [];

        if (username && typeof username === "string" && username.trim()) {
            sets.push("username = ?");
            vals.push(username.trim());
        }
        if (full_name && typeof full_name === "string" && full_name.trim()) {
            sets.push("full_name = ?");
            vals.push(full_name.trim());
        }
        if (
            new_password &&
            typeof new_password === "string" &&
            new_password.trim()
        ) {
            const newHash = md5(new_password).slice(0, 16);
            sets.push("password_hash = ?");
            vals.push(newHash);
        }

        if (!sets.length) {
            return res.json({
                ok: true,
                message: "No hay cambios para aplicar",
            });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [result] = await conn.query(
            `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
            [...vals, id]
        );
        await conn.commit();

        if (!result.affectedRows)
            return res.status(404).json({ error: "Usuario no existe" });
        return res.json({ ok: true });
    } catch (e) {
        if (conn) {
            try {
                await conn.rollback();
            } catch {}
        }
        if (e && e.code === "ER_DUP_ENTRY") {
            return res
                .status(409)
                .json({ error: "Nombre de usuario ya está en uso" });
        }
        console.error("PUT /users/:id error:", e);
        res.status(500).json({ error: "No se pudo editar el perfil" });
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch {}
        }
    }
});

router.post("/:id/photo", upload.single("image"), async (req, res) => {
    let conn;
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "id inválido" });
        if (!req.file)
            return res.status(400).json({ error: "image es requerido" });

        const hasPhoto = await ensurePhotoColumnExists();
        if (!hasPhoto) {
            return res.status(409).json({
                error: "La columna photo_url no existe en la tabla users.",
                suggestion: `Ejecuta: ALTER TABLE users ADD COLUMN photo_url VARCHAR(500) NULL AFTER balance;`,
            });
        }

        const key = await storage.upload({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            folder: "Fotos_Perfil",
            nameBase: `u_${id}`,
        });

        conn = await pool.getConnection();
        await conn.beginTransaction();
        const [result] = await conn.query(
            `UPDATE users SET photo_url = ? WHERE id = ?`,
            [key, id]
        );
        await conn.commit();

        if (!result.affectedRows)
            return res.status(404).json({ error: "Usuario no existe" });

        return res.json({
            ok: true,
            photo_key: key,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(key)
                : key,
        });
    } catch (e) {
        if (conn) {
            try {
                await conn.rollback();
            } catch {}
        }
        console.error("POST /users/:id/photo error:", e);
        res.status(500).json({
            error: "No se pudo actualizar la foto de perfil",
        });
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch {}
        }
    }
});

router.get("/:id/notifications", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [rows] = await pool.query(
            `SELECT id, type, title, body, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
            [id]
        );
        res.json(rows);
    } catch (e) {
        console.error("GET /users/:id/notifications error:", e);
        res.status(500).json({
            error: "No se pudieron obtener las notificaciones",
        });
    }
});

router.put("/:id/notifications/:notifId/read", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const notifId = Number(req.params.notifId);
        const [r] = await pool.query(
            `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
            [notifId, id]
        );
        if (!r.affectedRows)
            return res.status(404).json({ error: "No encontrada" });
        res.json({ ok: true });
    } catch (e) {
        console.error("PUT /users/:id/notifications/:notifId/read error:", e);
        res.status(500).json({
            error: "No se pudo actualizar la notificación",
        });
    }
});

export default router;
