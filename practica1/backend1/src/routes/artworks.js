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

/** Helper para leer el primer recordset de CALL ... */
function firstRs(callResult) {
    // mysql2/promise retorna: [ [rows], [fields], ... ]
    // Cuando es CALL, el primer elemento es un array (result set 0)
    if (Array.isArray(callResult) && Array.isArray(callResult[0])) {
        return callResult[0];
    }
    return callResult;
}

/** GET /artworks  -> lista pública con paginación */
router.get("/", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || "100", 10), 200);
        const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

        const [rs] = await pool.query("CALL sp_artworks_list(?, ?)", [
            limit,
            offset,
        ]);
        const rows = firstRs(rs);

        const data = rows.map((r) => ({
            id: r.id,
            name: r.name,
            image_name: r.image_name,
            url_key: r.url,
            price: r.price,
            is_available: !!r.is_available,
            seller_id: r.seller_id,
            seller: r.seller,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(r.url)
                : r.url,
        }));

        res.json(data);
    } catch (e) {
        console.error("GET /artworks error:", e);
        res.status(500).json({ error: "No se pudieron listar las obras" });
    }
});

/** GET /artworks/created?userId=... -> obras creadas por un autor (paginado) */
router.get("/created", async (req, res) => {
    try {
        const ownerId = Number(req.query.userId);
        if (!ownerId)
            return res.status(400).json({ error: "userId es requerido" });

        const limit = Math.min(parseInt(req.query.limit || "100", 10), 200);
        const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

        const [rs] = await pool.query("CALL sp_artworks_created(?, ?, ?)", [
            ownerId,
            limit,
            offset,
        ]);
        const rows = firstRs(rs);

        const data = rows.map((a) => {
            const publicUrl = storage.publicUrlFromKey
                ? storage.publicUrlFromKey(a.url)
                : a.url;
            return {
                id: a.id,
                name: a.name,
                image_name: a.image_name,
                url_key: a.url,
                public_url: publicUrl,
                price: a.price,
                is_available: !!a.is_available,
                acquisition_type: a.acquisition_type, // 'uploaded' | 'purchased'
                original_owner_id: a.original_owner_id,
                original_owner_full_name: a.original_owner_full_name,
                current_owner_id: a.current_owner_id,
                current_owner_full_name: a.current_owner_full_name,
                created_at: a.created_at,
                updated_at: a.updated_at,
            };
        });

        res.json(data);
    } catch (e) {
        console.error("GET /artworks/created error:", e);
        res.status(500).json({
            error: "No se pudieron obtener las obras creadas",
        });
    }
});

/** GET /artworks/mine?userId=... -> inventario del usuario */
router.get("/mine", async (req, res) => {
    try {
        const userId = Number(req.query.userId);
        if (!userId)
            return res.status(400).json({ error: "userId es requerido" });

        const [rs] = await pool.query("CALL sp_artworks_mine(?)", [userId]);
        const rows = firstRs(rs);

        const data = rows.map((a) => {
            const publicUrl = storage.publicUrlFromKey
                ? storage.publicUrlFromKey(a.url)
                : a.url;
            return {
                id: a.id,
                name: a.name,
                image_name: a.image_name,
                url_key: a.url,
                price: a.price,
                is_available: !!a.is_available,
                acquisition_type: a.acquisition_type,
                seller_id: a.original_owner_id,
                seller: a.original_owner_full_name,
                public_url: publicUrl,
            };
        });

        res.json(data);
    } catch (e) {
        console.error("GET /artworks/mine error:", e);
        res.status(500).json({ error: "No se pudo obtener el inventario" });
    }
});

/** POST /artworks/upload  (multipart: image, body: userId, name, price) */
router.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const userId = parseInt(req.body.userId, 10);
        const price = Number(req.body.price ?? 0);
        const name = (req.body.name || req.body.title || "").trim();

        if (!userId)
            return res.status(400).json({ error: "userId es requerido" });
        if (!req.file)
            return res
                .status(400)
                .json({ error: "image (archivo) es requerido" });
        if (Number.isNaN(price) || price < 0)
            return res
                .status(400)
                .json({ error: "price debe ser un número >= 0" });
        if (!name)
            return res
                .status(400)
                .json({ error: "name (nombre de la obra) es requerido" });
        if (name.length > 255)
            return res
                .status(400)
                .json({ error: "name no puede exceder 255 caracteres" });

        // 1) Subir imagen -> obtener KEY
        const key = await storage.upload({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            folder: "Fotos_Publicadas",
            nameBase: `art_${userId}`,
        });

        // 2) Dejar que la BD haga el INSERT (reglas en triggers + SP)
        const [rs] = await pool.query("CALL sp_artwork_publish(?, ?, ?, ?)", [
            userId,
            name,
            price,
            key,
        ]);
        const rows = firstRs(rs);
        const newId =
            rows?.[0]?.id ??
            rows?.[0]?.insert_id ??
            rows?.[0]?.LAST_INSERT_ID ??
            null;
        await pool.query("CALL sp_notify(?, ?, ?, ?)", [
            userId,
            "system",
            "Obra publicada",
            `Publicaste "${name}" por Q${Number(price).toFixed(2)}.`,
        ]);

        return res.status(201).json({
            id: newId,
            name,
            url_key: key,
            public_url: storage.publicUrlFromKey
                ? storage.publicUrlFromKey(key)
                : key,
            price,
        });
    } catch (e) {
        if (e && e.code === "ER_DUP_ENTRY") {
            return res
                .status(409)
                .json({ error: "Esta imagen ya fue publicada" });
        }
        console.error("POST /artworks/upload error:", e);
        return res.status(500).json({ error: "No se pudo publicar la obra" });
    }
});

/** Debug: mantiene igual */
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
