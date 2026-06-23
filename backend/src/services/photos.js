import fs from "fs";
import path from "path";

export function getUploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export function getPhotosDir() {
  return path.join(getUploadRoot(), "photos");
}

/**
 * Normalise photo_lien vers un chemin relatif uploads/photos/... utilisable en prod.
 * Accepte : uploads/photos/x.jpg, URL, chemin absolu serveur, ou simple nom de fichier.
 */
export function resolvePhotoLien(photoLien) {
  if (!photoLien) return null;
  const s = String(photoLien).trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  const photosDir = getPhotosDir();

  if (s.startsWith("uploads/photos/")) {
    const rel = s.replace(/^uploads\//, "");
    const full = path.join(getUploadRoot(), rel);
    if (fs.existsSync(full)) return s;
  }

  const basename = path.basename(s);
  if (basename) {
    const direct = path.join(photosDir, basename);
    if (fs.existsSync(direct)) return `uploads/photos/${basename}`;

    if (fs.existsSync(photosDir)) {
      const match = fs
        .readdirSync(photosDir)
        .find((f) => f.toLowerCase() === basename.toLowerCase());
      if (match) return `uploads/photos/${match}`;
    }
  }

  if (path.isAbsolute(s) && fs.existsSync(s)) return s;

  return null;
}
