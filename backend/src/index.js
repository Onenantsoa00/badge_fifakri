import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ensureDir } from "./middleware/upload.js";
import { photosRouter } from "./routes/photos.js";
import { eglisesRouter } from "./routes/eglises.js";
import { matriculeStylesRouter } from "./routes/matriculeStyles.js";
import { templatesRouter } from "./routes/templates.js";
import { membresRouter } from "./routes/membres.js";
import { badgesRouter } from "./routes/badges.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

ensureDir(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// servir les fichiers uploadés (ex: uploads/photos/xxx.jpg)
app.use(
  "/uploads",
  express.static(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "badge-fifakri-api" });
});

app.use("/api/eglises", eglisesRouter);
app.use("/api/matricule-styles", matriculeStylesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/membres", membresRouter);
app.use("/api/badges", badgesRouter);
app.use("/api/photos", photosRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Erreur serveur" });
});

app.listen(PORT, () => {
  console.log(`API Fi.Fa.Kri badges sur http://localhost:${PORT}`);
});
