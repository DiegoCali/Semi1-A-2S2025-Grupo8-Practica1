import express from "express";
import multer from "multer";
import { pool } from "../db.js";
import { getStorage } from "../storage/index.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const storage = getStorage();

router.get("/", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || "100", 10), 200);
        const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

        const [rows] = await pool.query(
            `
      SELECT a.id, a.url, a.price, a.is_available,
             u.id AS seller_id, u.username AS seller
      FROM artworks a
      JOIN users u ON u.id = a.current_owner_id
      WHERE a.is_available = 1
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
      `,
            [limit, offset]
        );

        const withPublicUrl = rows.map((r) => ({
            ...r,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(r.url)
                : r.url,
        }));

        res.json(withPublicUrl);
    } catch (e) {
        console.error("GET /artworks error:", e);
        res.status(500).json({ error: "No se pudieron listar las obras" });
    }
});

router.get("/mine", async (req, res) => {
    try {
        const userId = parseInt(req.query.userId, 10);
        if (!userId)
            return res.status(400).json({ error: "userId es requerido" });

        const [rows] = await pool.query(
            `
      SELECT a.id, a.url, a.price, a.is_available, a.acquisition_type
      FROM artworks a
      WHERE a.current_owner_id = ?
      ORDER BY a.created_at DESC
      `,
            [userId]
        );

        const withPublicUrl = rows.map((r) => ({
            ...r,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(r.url)
                : r.url,
        }));

        res.json(withPublicUrl);
    } catch (e) {
        console.error("GET /artworks/mine error:", e);
        res.status(500).json({ error: "No se pudo obtener el inventario" });
    }
});

router.post("/upload", upload.single("image"), async (req, res) => {
    let conn;
    try {
        const userId = parseInt(req.body.userId, 10);
        const price = Number(req.body.price ?? 0);

        if (!userId)
            return res.status(400).json({ error: "userId es requerido" });
        if (!req.file)
            return res
                .status(400)
                .json({ error: "image (archivo) es requerido" });
        if (Number.isNaN(price) || price < 0) {
            return res
                .status(400)
                .json({ error: "price debe ser un número >= 0" });
        }

        const key = await storage.upload({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            folder: "Fotos_Publicadas",
            nameBase: `art_${userId}`,
        });

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [result] = await conn.query(
            `
      INSERT INTO artworks
        (original_owner_id, current_owner_id, acquisition_type, url, is_available, price)
      VALUES (?, ?, 'uploaded', ?, 1, ?)
      `,
            [userId, userId, key, price]
        );

        await conn.commit();

        return res.status(201).json({
            id: result.insertId,
            url_key: key,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(key)
                : key,
            price,
        });
    } catch (e) {
        if (conn) {
            try {
                await conn.rollback();
            } catch {}
        }
        if (e && e.code === "ER_DUP_ENTRY") {
            return res
                .status(409)
                .json({ error: "Esta imagen ya fue publicada" });
        }
        console.error("POST /artworks/upload error:", e);
        return res.status(500).json({ error: "No se pudo publicar la obra" });
    } finally {
        if (conn)
            try {
                conn.release();
            } catch {}
    }
});

router.get("/__debug", (req, res) => {
    try {
        const driver = process.env.STORAGE_DRIVER || "local";
        const localDir = process.env.LOCAL_UPLOAD_DIR || "./storage/uploads";
        return res.json({ driver, localDir, staticMount: "/static" });
    } catch (e) {
        return res.status(500).json({ error: "debug failed" });
    }
});

export default router;
