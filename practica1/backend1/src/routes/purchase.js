import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * POST /purchase
 * body: { buyerId, artworkId }
 *
 * Llama al SP transaccional sp_purchase(buyerId, artworkId)
 * La lógica de negocio (locks, saldo, transferencia, notificaciones)
 * vive en la base de datos.
 */
router.post("/", async (req, res) => {
  try {
    const { buyerId, artworkId } = req.body || {};
    const buyer = Number(buyerId);
    const artId = Number(artworkId);

    if (!buyer || !artId) {
      return res.status(400).json({ error: "buyerId y artworkId son requeridos" });
    }

    // Ejecuta el SP (él hace todo: valida, mueve saldos, transfiere, notifica)
    await pool.query("CALL sp_purchase(?, ?)", [buyer, artId]);

    // Si llegó aquí, la compra se concretó
    return res.json({ ok: true, artworkId: artId, buyerId: buyer });
  } catch (e) {
    // Errores de negocio señalados con SIGNAL 45000 desde el SP
    if (e && (e.errno === 1644 || e.sqlState === "45000")) {
      // Mensajes posibles desde el SP/Triggers:
      // - 'La obra no existe'
      // - 'La obra no está disponible'
      // - 'No puedes comprar tu propia obra'
      // - 'Saldo insuficiente'
      // - 'Vendedor no existe' / 'Comprador no existe'
      return res.status(409).json({ error: e.sqlMessage || "Operación inválida" });
    }

    // Deadlocks o timeouts (opcionales)
    if (e && e.code === "ER_LOCK_DEADLOCK") {
      return res.status(409).json({ error: "Conflicto de concurrencia, intenta de nuevo" });
    }

    console.error("POST /purchase error:", e);
    return res.status(500).json({ error: "No se pudo completar la compra" });
  }
});

export default router;
