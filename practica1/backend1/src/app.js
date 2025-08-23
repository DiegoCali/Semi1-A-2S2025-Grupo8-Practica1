import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import artworksRoutes from "./routes/artworks.js";
import usersRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import purchaseRoutes from "./routes/purchase.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const uploadDir = process.env.LOCAL_UPLOAD_DIR || "./uploads";
app.use("/static", express.static(path.resolve(uploadDir)));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/artworks", artworksRoutes);
app.use("/purchase", purchaseRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
