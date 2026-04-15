import { Router } from 'express';
import { query } from '../db.js';
import { buildBadgesPdf } from '../services/pdf.js';

export const badgesRouter = Router();

badgesRouter.post('/pdf', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : null;
    let sql = `SELECT id, nom, prenoms, eglizy, distrika, tokim_panompoana, matricule, photo_lien FROM membres`;
    const params = [];
    if (ids && ids.length) {
      sql += ` WHERE id = ANY($1::uuid[])`;
      params.push(ids);
    }
    sql += ` ORDER BY created_at ASC`;
    const { rows: membres } = await query(sql, params);
    if (!membres.length) {
      res.status(400).json({ error: 'Aucun membre à exporter' });
      return;
    }

    const { rows: tplRows } = await query(
      `SELECT path, layout FROM badge_templates WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`
    );
    const tpl = tplRows[0];

    const pdfBytes = await buildBadgesPdf({
      membres,
      templatePath: tpl?.path || null,
      layout: tpl?.layout || {},
    });

    const filename = `badges_fifakri_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (e) {
    next(e);
  }
});
