import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { parseMembresExcel } from '../services/excel.js';
import { computeMatriculeForMember } from '../services/matricule.js';

export const membresRouter = Router();

const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

async function resolveEgliseCode(eglizyText) {
  const { rows } = await query(
    `SELECT code FROM eglises
     WHERE upper(trim(code)) = upper(trim($1))
        OR lower(trim(nom)) = lower(trim($1))
     LIMIT 1`,
    [eglizyText]
  );
  return rows[0]?.code || null;
}

membresRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nom, prenoms, eglizy, distrika, tokim_panompoana, matricule, photo_lien, created_at
       FROM membres ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

membresRouter.post('/import-excel', excelUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier Excel requis (champ file)' });
      return;
    }
    const styleId = req.body.matricule_style_id ? Number(req.body.matricule_style_id) : null;
    const parsed = parseMembresExcel(req.file.buffer);
    const inserted = [];
    const errors = [];

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const r = parsed.rows[idx];
      const line = idx + 2;
      if (!r.nom || !r.prenoms || !r.eglizy || !r.tokim_panompoana) {
        errors.push({ line, error: 'Ligne incomplète (nom, prénoms, église, tokim requis)' });
        continue;
      }

      const code = await resolveEgliseCode(r.eglizy);
      if (!code) {
        errors.push({
          line,
          error: `Église non reconnue : "${r.eglizy}". Ajoutez-la dans la liste des codes.`,
        });
        continue;
      }

      let matricule = r.matricule_manual;
      if (!matricule) {
        try {
          matricule = await computeMatriculeForMember(
            { egliseCode: code, tokimDate: r.tokim_panompoana },
            styleId || undefined
          );
        } catch (e) {
          errors.push({ line, error: e.message || String(e) });
          continue;
        }
      }

      try {
        const { rows } = await query(
          `INSERT INTO membres (nom, prenoms, eglizy, distrika, tokim_panompoana, matricule, photo_lien)
           VALUES ($1, $2, $3, $4, $5::date, $6, $7)
           RETURNING id, nom, prenoms, eglizy, distrika, tokim_panompoana, matricule, photo_lien, created_at`,
          [
            r.nom,
            r.prenoms,
            r.eglizy,
            r.distrika || null,
            r.tokim_panompoana,
            matricule,
            r.photo_lien,
          ]
        );
        inserted.push(rows[0]);
      } catch (e) {
        if (e.code === '23505') {
          errors.push({ line, error: `Matricule déjà utilisé : ${matricule}` });
        } else {
          errors.push({ line, error: e.message || String(e) });
        }
      }
    }

    res.json({ inserted: inserted.length, membres: inserted, errors });
  } catch (e) {
    if (e.code === 'EXCEL_HEADERS') {
      res.status(400).json({ error: e.message });
      return;
    }
    next(e);
  }
});

membresRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { matricule, nom, prenoms, distrika, eglizy, tokim_panompoana, photo_lien } = req.body;
    const { rows } = await query(
      `UPDATE membres SET
        matricule = COALESCE($1, matricule),
        nom = COALESCE($2, nom),
        prenoms = COALESCE($3, prenoms),
        distrika = COALESCE($4, distrika),
        eglizy = COALESCE($5, eglizy),
        tokim_panompoana = COALESCE($6::date, tokim_panompoana),
        photo_lien = COALESCE($7, photo_lien)
      WHERE id = $8::uuid
      RETURNING id, nom, prenoms, eglizy, distrika, tokim_panompoana, matricule, photo_lien, created_at`,
      [
        matricule != null ? String(matricule).trim() : null,
        nom != null ? String(nom).trim() : null,
        prenoms != null ? String(prenoms).trim() : null,
        distrika !== undefined ? distrika : null,
        eglizy != null ? String(eglizy).trim() : null,
        tokim_panompoana != null ? String(tokim_panompoana).slice(0, 10) : null,
        photo_lien !== undefined ? photo_lien : null,
        id,
      ]
    );
    if (!rows.length) {
      res.status(404).json({ error: 'Membre introuvable' });
      return;
    }
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') res.status(409).json({ error: 'Matricule déjà utilisé' });
    else next(e);
  }
});

membresRouter.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query(`DELETE FROM membres WHERE id = $1::uuid`, [req.params.id]);
    if (!rowCount) {
      res.status(404).json({ error: 'Introuvable' });
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
