import { Router } from "express";
import { uploadPhoto } from "../middleware/uploadPhotos.js";

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
