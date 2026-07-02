import fs from "fs";
import path from "path";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

export function getUploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export function getPhotosDir() {
  return path.join(getUploadRoot(), "photos");
}

/** Extrait le nom de fichier depuis un chemin Unix ou Windows, sur tout OS. */
export function crossPlatformBasename(p) {
  const s = String(p || "")
    .trim()
    .replace(/\\/g, "/");
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

/** Détecte un chemin absolu local (Unix ou lecteur Windows D:\ / D:/). */
export function isCrossPlatformAbsolute(p) {
  const s = String(p || "").trim();
  if (!s || s.startsWith("http://") || s.startsWith("https://")) return false;
  if (path.isAbsolute(s)) return true;
  return /^[a-zA-Z]:[\\/]/.test(s);
}

/** Convertit un chemin saisi (Excel, Windows, Unix) vers le format natif du système. */
export function toNativeFsPath(p) {
  const s = String(p || "").trim();
  if (process.platform === "win32") {
    return s.replace(/\//g, "\\");
  }
  return s.replace(/\\/g, "/");
}

/** Variantes de séparateurs à tester pour fs.existsSync. */
function pathVariants(p) {
  const s = String(p || "").trim();
  const variants = new Set([s, toNativeFsPath(s)]);
  variants.add(s.replace(/\\/g, "/"));
  if (process.platform === "win32") {
    variants.add(s.replace(/\//g, "\\"));
  }
  return [...variants];
}

function findExistingPath(candidates) {
  for (const c of candidates) {
    if (!c) continue;
    for (const variant of pathVariants(c)) {
      try {
        if (fs.existsSync(variant)) return variant;
      } catch {
        // ignore invalid paths
      }
    }
  }
  return null;
}

function findUploadedPhoto(basename) {
  if (!basename) return null;
  const photosDir = getPhotosDir();
  const direct = path.join(photosDir, basename);
  if (fs.existsSync(direct)) return `uploads/photos/${basename}`;

  if (fs.existsSync(photosDir)) {
    const match = fs
      .readdirSync(photosDir)
      .find((f) => f.toLowerCase() === basename.toLowerCase());
    if (match) return `uploads/photos/${match}`;
  }
  return null;
}

function copyLocalPhotoToUploads(sourcePath) {
  const photosDir = getPhotosDir();
  fs.mkdirSync(photosDir, { recursive: true });
  const basename = crossPlatformBasename(sourcePath);
  const existing = findUploadedPhoto(basename);
  if (existing) return existing;

  const dest = path.join(photosDir, basename);
  fs.copyFileSync(sourcePath, dest);
  return `uploads/photos/${basename}`;
}

/**
 * Normalise photo_lien vers un chemin relatif uploads/photos/... utilisable en prod.
 * Accepte : uploads/photos/x.jpg, URL, chemin absolu serveur (Unix ou Windows),
 * chemin relatif, ou simple nom de fichier.
 */
export function resolvePhotoLien(photoLien, { copyToUploads = true } = {}) {
  if (!photoLien) return null;
  const s = String(photoLien).trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  const uploadRoot = getUploadRoot();
  const normalized = s.replace(/\\/g, "/");

  if (normalized.startsWith("uploads/photos/")) {
    const rel = normalized.replace(/^uploads\//, "");
    const full = path.join(uploadRoot, rel);
    if (fs.existsSync(full)) return normalized;
  }

  const basename = crossPlatformBasename(s);
  const uploaded = findUploadedPhoto(basename);
  if (uploaded) return uploaded;

  if (isCrossPlatformAbsolute(s)) {
    const existing = findExistingPath([s]);
    if (existing) {
      return copyToUploads ? copyLocalPhotoToUploads(existing) : existing;
    }
  }

  const relativeCandidates = [
    s,
    path.resolve(s),
    path.resolve(process.cwd(), s),
    path.resolve(process.cwd(), "backend", s),
    path.join(uploadRoot, s),
    path.join(uploadRoot, "photos", basename),
  ];
  const existingRelative = findExistingPath(relativeCandidates);
  if (existingRelative) {
    return copyToUploads
      ? copyLocalPhotoToUploads(existingRelative)
      : existingRelative;
  }

  return null;
}

/**
 * Importe toutes les images d'un dossier local vers uploads/photos/.
 * @param {string} folderPath - ex. D:\badge_fifakri\sary ou /home/user/photos
 */
export function importPhotosFromFolder(folderPath) {
  const nativeFolder = findExistingPath([folderPath]);
  if (!nativeFolder) {
    const err = new Error(`Dossier introuvable : "${folderPath}"`);
    err.code = "FOLDER_NOT_FOUND";
    throw err;
  }

  const stat = fs.statSync(nativeFolder);
  if (!stat.isDirectory()) {
    const err = new Error(`Le chemin n'est pas un dossier : "${folderPath}"`);
    err.code = "NOT_A_DIRECTORY";
    throw err;
  }

  const photosDir = getPhotosDir();
  fs.mkdirSync(photosDir, { recursive: true });

  const imported = [];
  const skipped = [];

  for (const entry of fs.readdirSync(nativeFolder)) {
    const ext = path.extname(entry).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;

    const source = path.join(nativeFolder, entry);
    if (!fs.statSync(source).isFile()) continue;

    const existing = findUploadedPhoto(entry);
    if (existing) {
      skipped.push({ name: entry, path: existing, reason: "already_uploaded" });
      continue;
    }

    const dest = path.join(photosDir, entry);
    fs.copyFileSync(source, dest);
    const photoPath = `uploads/photos/${entry}`;
    imported.push({ name: entry, path: photoPath });
  }

  return { imported: imported.length, skipped: skipped.length, photos: imported };
}
