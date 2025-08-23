import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
    let conn;
    try {
        const { buyerId, artworkId } = req.body || {};
        if (!buyerId || !artworkId) {
            return res
                .status(400)
                .json({ error: "buyerId y artworkId son requeridos" });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1) Bloquear filas relevantes
        const [[art]] = await conn.query(
            `SELECT id, current_owner_id, is_available, price
       FROM artworks
       WHERE id = ?
       FOR UPDATE`,
            [artworkId]
        );

        if (!art) {
            await conn.rollback();
            return res.status(404).json({ error: "La obra no existe" });
        }
        if (!art.is_available) {
            await conn.rollback();
            return res
                .status(409)
                .json({ error: "La obra no está disponible" });
        }
        if (art.current_owner_id === Number(buyerId)) {
            await conn.rollback();
            return res
                .status(409)
                .json({ error: "No puedes comprar tu propia obra" });
        }

        const price = Number(art.price);

        const [[buyer]] = await conn.query(
            `SELECT id, balance FROM users WHERE id = ? FOR UPDATE`,
            [buyerId]
        );
        if (!buyer) {
            await conn.rollback();
            return res.status(404).json({ error: "Comprador no existe" });
        }

        const [[seller]] = await conn.query(
            `SELECT id, balance FROM users WHERE id = ? FOR UPDATE`,
            [art.current_owner_id]
        );
        if (!seller) {
            await conn.rollback();
            return res.status(404).json({ error: "Vendedor no existe" });
        }

        if (Number(buyer.balance) < price) {
            await conn.rollback();
            return res.status(409).json({ error: "Saldo insuficiente" });
        }

        await conn.query(
            `UPDATE users SET balance = balance - ? WHERE id = ?`,
            [price, buyerId]
        );
        await conn.query(
            `UPDATE users SET balance = balance + ? WHERE id = ?`,
            [price, seller.id]
        );

        await conn.query(
            `UPDATE artworks
       SET current_owner_id = ?, acquisition_type = 'purchased', is_available = 0
       WHERE id = ?`,
            [buyerId, artworkId]
        );

        await conn.query(
            `INSERT INTO notifications (user_id, type, title, body) VALUES
        (?, 'purchase', 'Compra exitosa', CONCAT('Has comprado la obra #', ? , ' por Q', FORMAT(?, 2))),
        (?, 'sale',     'Venta realizada', CONCAT('Has vendido la obra #', ? , ' por Q', FORMAT(?, 2)))`,
            [buyerId, artworkId, price, seller.id, artworkId, price]
        );

        await conn.commit();

        return res.json({
            ok: true,
            artworkId,
            buyerId,
            sellerId: seller.id,
            price,
        });
    } catch (e) {
        if (conn) {
            try {
                await conn.rollback();
            } catch {}
        }
        console.error("POST /purchase error:", e);
        return res
            .status(500)
            .json({ error: "No se pudo completar la compra" });
    } finally {
        if (conn)
            try {
                conn.release();
            } catch {}
    }
});

export default router;
