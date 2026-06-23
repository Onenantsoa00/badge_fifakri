import path from "path";
import { makeUploader } from "./upload.js";

function safeBasename(originalname) {
  const ext = path.extname(originalname) || "";
  const base = path
    .basename(originalname, ext)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  return base ? `${base}${ext.toLowerCase()}` : null;
}

// conserve le nom de fichier d'origine pour matcher la colonne Photo de l'Excel
export const uploadPhoto = makeUploader("photos", (file) => {
  const safe = safeBasename(file.originalname);
  if (safe) return safe;
  const ext = path.extname(file.originalname) || "";
  return `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext.toLowerCase()}`;
});
