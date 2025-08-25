import express from "express";
import crypto from "crypto";
import multer from "multer";
import { pool } from "../db.js";
import { getStorage } from "../storage/index.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const storage = getStorage();

function md5(text) {
  return crypto.createHash("md5").update(text, "utf8").digest("hex");
}

// POST /auth/register  (JSON o multipart con 'image')
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { username, full_name, password } = req.body || {};
    if (!username || !full_name || !password) {
      return res.status(400).json({ error: "username, full_name y password son obligatorios" });
    }

    const hash16 = md5(password).slice(0, 16);

    // 1) Crear usuario
    const [result] = await pool.query(
      `INSERT INTO users (username, full_name, password_hash, balance, photo_url)
       VALUES (?, ?, ?, 0.00, NULL)`,
      [username.trim(), full_name.trim(), hash16]
    );
    const userId = result.insertId;

    // 2) Si hay imagen, intentar subirla (sin romper el registro si falla)
    let photoKey = null;
    if (req.file) {
      try {
        photoKey = await storage.upload({
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          folder: "Fotos_Perfil",
          nameBase: `u_${userId}`,
        });
        await pool.query(`UPDATE users SET photo_url = ? WHERE id = ?`, [photoKey, userId]);
      } catch (err) {
        console.error("REGISTER_PHOTO_UPLOAD_ERROR:", err);
      }
    }

    return res.status(201).json({
      ok: true,
      id: userId,
      username: username.trim(),
      full_name: full_name.trim(),
      balance: "0.00",
      ...(photoKey && {
        photo_key: photoKey,
        public_url: storage.publicUrlFromKey ? storage.publicUrlFromKey(photoKey) : photoKey,
      }),
      ...(!photoKey && req.file ? { warning: "La imagen no se pudo guardar; el usuario se creó sin foto." } : {}),
    });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Usuario ya existe" });
    }
    console.error("REGISTER_ERROR:", e);
    return res.status(500).json({ error: "No se pudo registrar" });
  }
});

// POST /auth/login (igual que lo tenías)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Faltan campos" });

    const hash = md5(password).slice(0, 16);
    const [rows] = await pool.query(
      `SELECT id, username, full_name, balance FROM users WHERE username=? AND password_hash=?`,
      [username, hash]
    );
    if (!rows.length) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json(rows[0]);
  } catch (e) {
    console.error("LOGIN_ERROR:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
