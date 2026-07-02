import { Router } from "express";
import { uploadPhoto } from "../middleware/uploadPhotos.js";
import { importPhotosFromFolder } from "../services/photos.js";

export const photosRouter = Router();

function photoResponse(req, file) {
  const photoPath = `uploads/photos/${file.filename}`;
  return {
    originalName: file.originalname,
    path: photoPath,
    url: `${req.protocol}://${req.get("host")}/${photoPath}`,
  };
}

photosRouter.post("/", uploadPhoto.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Photo requise" });
  return res.json(photoResponse(req, req.file));
});

photosRouter.post("/bulk", uploadPhoto.array("photos", 500), async (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ error: "Au moins une photo requise" });
  }
  const photos = req.files.map((f) => photoResponse(req, f));
  return res.json({ uploaded: photos.length, photos });
});

photosRouter.post("/import-folder", async (req, res) => {
  const folderPath = String(req.body?.folderPath || "").trim();
  if (!folderPath) {
    return res.status(400).json({ error: "Chemin du dossier requis (folderPath)" });
  }
  try {
    const result = importPhotosFromFolder(folderPath);
    return res.json({
      uploaded: result.imported,
      skipped: result.skipped,
      photos: result.photos,
    });
  } catch (e) {
    if (e.code === "FOLDER_NOT_FOUND" || e.code === "NOT_A_DIRECTORY") {
      return res.status(400).json({ error: e.message });
    }
    throw e;
  }
});
