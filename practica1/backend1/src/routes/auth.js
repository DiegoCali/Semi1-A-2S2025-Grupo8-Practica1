import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";

const router = express.Router();

function md5(text) {
    return crypto.createHash("md5").update(text, "utf8").digest("hex");
}

router.post("/register", async (req, res) => {
    const { username, full_name, password } = req.body;
    if (!username || !full_name || !password) {
        return res
            .status(400)
            .json({ error: "username, full_name y password son obligatorios" });
    }
    try {
        const hash = md5(password);
        await pool.query(
            `INSERT INTO users (username, full_name, password_hash, balance) VALUES (?, ?, ?, 0)`,
            [username, full_name, hash.slice(0, 16)]
        );
        res.status(201).json({ ok: true });
    } catch (e) {
        if (e.code === "ER_DUP_ENTRY")
            return res.status(409).json({ error: "Usuario ya existe" });
        console.error(e);
        res.status(500).json({ error: "No se pudo registrar" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Faltan campos" });

        const hash = md5(password).slice(0, 16);
        const [rows] = await pool.query(
            `SELECT id, username, full_name, balance FROM users WHERE username=? AND password_hash=?`,
            [username, hash]
        );

        if (!rows.length)
            return res.status(401).json({ error: "Credenciales inválidas" });
        res.json(rows[0]);
    } catch (e) {
        console.error("LOGIN_ERROR:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

export default router;
