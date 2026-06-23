import path from "path";
import { makeUploader } from "./upload.js";

// utilise le dossier uploads/photos (upload root configuré via UPLOAD_DIR)
export const uploadPhoto = makeUploader("photos", (file) => {
  const ext = path.extname(file.originalname) || "";
  const name = Date.now() + "_" + Math.round(Math.random() * 1e9) + ext;
  return name;
});
