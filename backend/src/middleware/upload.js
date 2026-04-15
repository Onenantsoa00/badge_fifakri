import fs from 'fs';
import multer from 'multer';
import path from 'path';

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function makeUploader(subdir, filenameFn) {
  const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const dest = path.join(uploadRoot, subdir);
  ensureDir(dest);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const name = filenameFn(file);
      cb(null, name);
    },
  });

  return multer({ storage });
}
