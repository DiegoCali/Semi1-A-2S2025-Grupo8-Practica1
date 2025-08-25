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

// mysql2/promise devuelve varios recordsets en CALL; tomamos el primero
function firstRs(callResult) {
    // pool.query -> [rows, fields]; rows suele ser [ [rows0], [fields0], ... ]
    const rows = callResult?.[0];
    return Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
}

// POST /auth/register  (JSON o multipart con 'image')
router.post("/register", upload.single("image"), async (req, res) => {
    try {
        const { username, full_name, password } = req.body || {};
        if (!username || !full_name || !password) {
            return res
                .status(400)
                .json({
                    error: "username, full_name y password son obligatorios",
                });
        }

        const hash16 = md5(password).slice(0, 16);

        // 1) Crear usuario vía SP (balance=0, photo_url=NULL)
        const [rsCreate] = await pool.query("CALL sp_user_create(?, ?, ?)", [
            username.trim(),
            full_name.trim(),
            hash16,
        ]);
        const createRows = firstRs(rsCreate);
        const userId = createRows?.[0]?.id;

        // 2) Si hay imagen, subir y guardar KEY con SP (no rompemos si falla)
        let photoKey = null;
        if (req.file) {
            try {
                photoKey = await storage.upload({
                    buffer: req.file.buffer,
                    mimeType: req.file.mimetype,
                    folder: "Fotos_Perfil",
                    nameBase: `u_${userId}`,
                });
                await pool.query("CALL sp_user_set_photo(?, ?)", [
                    userId,
                    photoKey,
                ]);
            } catch (err) {
                console.error("REGISTER_PHOTO_UPLOAD_ERROR:", err);
            }
        }

        await pool.query("CALL sp_notify(?, ?, ?, ?)", [
            userId,
            "system",
            "¡Bienvenido a ArtGalleryCloud!",
            `Hola ${full_name.trim()}, tu cuenta fue creada correctamente.`,
        ]);

        return res.status(201).json({
            ok: true,
            id: userId,
            username: username.trim(),
            full_name: full_name.trim(),
            balance: "0.00",
            ...(photoKey && {
                photo_key: photoKey,
                public_url: storage.publicUrlFromKey
                    ? storage.publicUrlFromKey(photoKey)
                    : photoKey,
            }),
            ...(!photoKey && req.file
                ? {
                      warning:
                          "La imagen no se pudo guardar; el usuario se creó sin foto.",
                  }
                : {}),
        });
    } catch (e) {
        if (e?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Usuario ya existe" });
        }
        console.error("REGISTER_ERROR:", e);
        return res.status(500).json({ error: "No se pudo registrar" });
    }
});

// POST /auth/login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password)
            return res.status(400).json({ error: "Faltan campos" });

        const hash16 = md5(password).slice(0, 16);
        const [rs] = await pool.query("CALL sp_auth_login(?, ?)", [
            username,
            hash16,
        ]);
        const rows = firstRs(rs);

        if (!rows?.length)
            return res.status(401).json({ error: "Credenciales inválidas" });
        // rows[0]: { id, username, full_name, balance }
        return res.json(rows[0]);
    } catch (e) {
        console.error("LOGIN_ERROR:", e);
        return res.status(500).json({ error: "Internal error" });
    }
});

export default router;
