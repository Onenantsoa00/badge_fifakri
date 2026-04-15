import { Router } from 'express';
import { query } from '../db.js';

export const eglisesRouter = Router();

eglisesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nom, code, created_at FROM eglises ORDER BY nom`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

eglisesRouter.post('/', async (req, res, next) => {
  try {
    const { nom, code } = req.body;
    if (!nom || !code) {
      res.status(400).json({ error: 'nom et code sont requis' });
      return;
    }
    const { rows } = await query(
      `INSERT INTO eglises (nom, code) VALUES ($1, $2) RETURNING id, nom, code, created_at`,
      [String(nom).trim(), String(code).trim().toUpperCase()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') res.status(409).json({ error: 'Code église déjà utilisé' });
    else next(e);
  }
});

eglisesRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nom, code } = req.body;
    const { rows } = await query(
      `UPDATE eglises SET nom = COALESCE($1, nom), code = COALESCE($2, code) WHERE id = $3 RETURNING id, nom, code, created_at`,
      [nom != null ? String(nom).trim() : null, code != null ? String(code).trim().toUpperCase() : null, id]
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

eglisesRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await query(`DELETE FROM eglises WHERE id = $1`, [id]);
    if (!rowCount) {
      res.status(404).json({ error: 'Introuvable' });
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
