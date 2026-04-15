import path from 'path';
import { Router } from 'express';
import { query } from '../db.js';
import { makeUploader } from '../middleware/upload.js';

export const templatesRouter = Router();

const upload = makeUploader(
  'templates',
  (file) => `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
);

templatesRouter.get('/active', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, filename, path, mime, layout, uploaded_at FROM badge_templates WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`
    );
    res.json(rows[0] || null);
  } catch (e) {
    next(e);
  }
});

templatesRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier modèle requis (champ file)' });
      return;
    }
    let layout = req.body.layout;
    if (typeof layout === 'string') {
      try {
        layout = JSON.parse(layout);
      } catch {
        layout = {};
      }
    }
    await query(`UPDATE badge_templates SET is_active = FALSE`);
    const rel = req.file.path;
    const { rows } = await query(
      `INSERT INTO badge_templates (filename, path, mime, is_active, layout)
       VALUES ($1, $2, $3, TRUE, $4::jsonb) RETURNING id, filename, path, mime, layout, uploaded_at`,
      [req.file.originalname, rel, req.file.mimetype, JSON.stringify(layout || {})]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

templatesRouter.patch('/:id/layout', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { layout } = req.body;
    if (!layout || typeof layout !== 'object') {
      res.status(400).json({ error: 'layout (objet JSON) requis' });
      return;
    }
    const { rows } = await query(
      `UPDATE badge_templates SET layout = $1::jsonb WHERE id = $2 RETURNING id, filename, path, layout, uploaded_at`,
      [JSON.stringify(layout), id]
    );
    if (!rows.length) {
      res.status(404).json({ error: 'Introuvable' });
      return;
    }
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
