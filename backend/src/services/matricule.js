import { query } from '../db.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function mmyy(d = new Date()) {
  return pad2(d.getMonth() + 1) + String(d.getFullYear()).slice(-2);
}

function ddmmyy(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error('Date Tokim-panompoana invalide');
  return pad2(d.getDate()) + pad2(d.getMonth() + 1) + String(d.getFullYear()).slice(-2);
}

function normalizeEgliseCode(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (c + 'XXXX').slice(0, 4);
}

/**
 * Construit le préfixe avant le compteur (ex. 0526AMRY180421).
 */
export function buildMatriculePrefix({ egliseCode, tokimDate, refDate = new Date() }) {
  const prefix =
    mmyy(refDate) + normalizeEgliseCode(egliseCode) + ddmmyy(tokimDate);
  return prefix;
}

/**
 * Trouve le prochain compteur 3 chiffres pour ce préfixe (unicité par matricule complet).
 */
export async function nextCounterForPrefix(prefix) {
  const like = `${prefix}%`;
  const { rows } = await query(
    `SELECT matricule FROM membres WHERE matricule LIKE $1 ORDER BY matricule DESC LIMIT 50`,
    [like]
  );
  let max = 0;
  for (const r of rows) {
    const m = r.matricule;
    if (!m.startsWith(prefix)) continue;
    const tail = m.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return max + 1;
}

export function formatMatriculeFromSegments(segments, ctx) {
  const { refDate, egliseCode, tokimDate, counter } = ctx;
  let out = '';
  for (const seg of segments) {
    switch (seg) {
      case 'MMYY':
        out += mmyy(refDate);
        break;
      case 'EGLISE_CODE':
        out += normalizeEgliseCode(egliseCode);
        break;
      case 'TOKIM_DDMMYY':
        out += ddmmyy(tokimDate);
        break;
      case 'COUNTER_3':
        out += String(counter).padStart(3, '0');
        break;
      default:
        out += String(seg);
    }
  }
  return out;
}

export async function getDefaultMatriculeStyle() {
  const { rows } = await query(
    `SELECT id, segments FROM matricule_styles WHERE is_default = TRUE ORDER BY id LIMIT 1`
  );
  if (rows.length) return rows[0];
  const { rows: r2 } = await query(
    `SELECT id, segments FROM matricule_styles ORDER BY id LIMIT 1`
  );
  return r2[0] || { id: null, segments: ['MMYY', 'EGLISE_CODE', 'TOKIM_DDMMYY', 'COUNTER_3'] };
}

export async function computeMatriculeForMember(
  { egliseCode, tokimDate },
  styleId = null
) {
  let segments;
  if (styleId) {
    const { rows } = await query(`SELECT segments FROM matricule_styles WHERE id = $1`, [
      styleId,
    ]);
    segments = rows[0]?.segments;
  }
  if (!segments) {
    const st = await getDefaultMatriculeStyle();
    segments = st.segments;
  }
  if (typeof segments === 'string') {
    try {
      segments = JSON.parse(segments);
    } catch {
      segments = ['MMYY', 'EGLISE_CODE', 'TOKIM_DDMMYY', 'COUNTER_3'];
    }
  }

  const refDate = new Date();
  const prefixWithoutCounter = formatMatriculeFromSegments(
    segments.filter((s) => s !== 'COUNTER_3'),
    {
      refDate,
      egliseCode,
      tokimDate,
      counter: 0,
    }
  );
  const counter = await nextCounterForPrefix(prefixWithoutCounter);
  return formatMatriculeFromSegments(segments, {
    refDate,
    egliseCode,
    tokimDate,
    counter,
  });
}
