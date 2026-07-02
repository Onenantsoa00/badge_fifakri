import path from "path";
import { crossPlatformBasename } from "../services/photos.js";
import { makeUploader } from "./upload.js";

function safeBasename(originalname) {
  // Windows peut envoyer C:\fakepath\12.jpg ou D:\dossier\12.jpg : extraire le vrai nom
  const nameOnly =
    crossPlatformBasename(originalname) || String(originalname || "").trim();
  const ext = path.extname(nameOnly) || "";
  const base = nameOnly
    .slice(0, nameOnly.length - ext.length)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  return base ? `${base}${ext.toLowerCase()}` : null;
}

// conserve le nom de fichier d'origine pour matcher la colonne Photo de l'Excel
export const uploadPhoto = makeUploader("photos", (file) => {
  const safe = safeBasename(file.originalname);
  if (safe) return safe;
  const ext = path.extname(crossPlatformBasename(file.originalname) || "") || "";
  return `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext.toLowerCase()}`;
});
