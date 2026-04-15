import { Router } from 'express';
import { query } from '../db.js';

export const matriculeStylesRouter = Router();

matriculeStylesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nom, segments, is_default, created_at FROM matricule_styles ORDER BY id`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

matriculeStylesRouter.post('/', async (req, res, next) => {
  try {
    const { nom, segments, is_default } = req.body;
    if (!nom || !Array.isArray(segments)) {
      res.status(400).json({ error: 'nom et segments (tableau) sont requis' });
      return;
    }
    if (is_default) {
      await query(`UPDATE matricule_styles SET is_default = FALSE`);
    }
    const { rows } = await query(
      `INSERT INTO matricule_styles (nom, segments, is_default) VALUES ($1, $2::jsonb, $3) RETURNING *`,
      [String(nom).trim(), JSON.stringify(segments), Boolean(is_default)]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

matriculeStylesRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nom, segments, is_default } = req.body;
    if (is_default) {
      await query(`UPDATE matricule_styles SET is_default = FALSE`);
    }
    const { rows } = await query(
      `UPDATE matricule_styles SET
        nom = COALESCE($1, nom),
        segments = COALESCE($2::jsonb, segments),
        is_default = COALESCE($3, is_default)
      WHERE id = $4 RETURNING *`,
      [
        nom != null ? String(nom).trim() : null,
        segments != null ? JSON.stringify(segments) : null,
        is_default != null ? Boolean(is_default) : null,
        id,
      ]
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
