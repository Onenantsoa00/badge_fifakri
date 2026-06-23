import { Router } from "express";
import { uploadPhoto } from "../middleware/uploadPhotos.js";

export const photosRouter = Router();

photosRouter.post("/", uploadPhoto.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Photo requise" });

  const photoPath = `uploads/photos/${req.file.filename}`; // chemin relatif

  return res.json({
    path: photoPath,
    url: `${req.protocol}://${req.get("host")}/${photoPath}`,
  });
});
