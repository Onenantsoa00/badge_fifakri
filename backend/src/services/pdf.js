import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** A4 portrait en points (72 dpi) */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const COLS = 2;
const ROWS = 6;

const DEFAULT_LAYOUT = {
  photo: { x: 0.05, y: 0.14, w: 0.3, h: 0.55 },
  nom: { x: 0.38, y: 0.72, size: 11 },
  prenoms: { x: 0.38, y: 0.6, size: 11 },
  distrika: { x: 0.38, y: 0.48, size: 9 },
  eglizy: { x: 0.38, y: 0.38, size: 9 },
  tokim: { x: 0.38, y: 0.28, size: 8 },
  matricule: { x: 0.38, y: 0.14, size: 10 },
};

async function loadImageBytes(photoLien) {
  if (!photoLien) return null;
  const s = String(photoLien).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    const res = await fetch(s);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  const abs = path.isAbsolute(s) ? s : path.resolve(s);
  if (fs.existsSync(abs)) return fs.readFileSync(abs);
  return null;
}

function mergeLayout(dbLayout) {
  return { ...DEFAULT_LAYOUT, ...(dbLayout || {}) };
}

/**
 * @param {object} opts
 * @param {Array<object>} opts.membres - max utilisé par pages de 12
 * @param {string|null} opts.templatePath
 * @param {object} opts.layout
 */
export async function buildBadgesPdf({ membres, templatePath, layout }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let tplImage = null;
  if (templatePath && fs.existsSync(templatePath)) {
    const bytes = fs.readFileSync(templatePath);
    try {
      tplImage = await pdf.embedJpg(bytes);
    } catch {
      try {
        tplImage = await pdf.embedPng(bytes);
      } catch {
        tplImage = null;
      }
    }
  }

  const lay = mergeLayout(layout);
  const perPage = COLS * ROWS;
  const cellW = PAGE_W / COLS;
  const cellH = PAGE_H / ROWS;

  for (let p = 0; p < membres.length; p += perPage) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const chunk = membres.slice(p, p + perPage);

    for (let i = 0; i < chunk.length; i++) {
      const col = i < ROWS ? 0 : 1;
      const rowFromTop = i < ROWS ? i : i - ROWS;
      const ox = col * cellW;
      const oy = PAGE_H - (rowFromTop + 1) * cellH;
      const m = chunk[i];

      if (tplImage) {
        const ir = tplImage.scale(1);
        const scale = Math.min(cellW / ir.width, cellH / ir.height);
        const dw = ir.width * scale;
        const dh = ir.height * scale;
        const dx = ox + (cellW - dw) / 2;
        const dy = oy + (cellH - dh) / 2;
        page.drawImage(tplImage, { x: dx, y: dy, width: dw, height: dh });
      } else {
        page.drawRectangle({
          x: ox + 4,
          y: oy + 4,
          width: cellW - 8,
          height: cellH - 8,
          borderColor: rgb(0.75, 0.75, 0.75),
          borderWidth: 1,
        });
      }

      const photoBytes = await loadImageBytes(m.photo_lien);
      if (photoBytes) {
        let img = null;
        try {
          img = await pdf.embedJpg(photoBytes);
        } catch {
          try {
            img = await pdf.embedPng(photoBytes);
          } catch {
            img = null;
          }
        }
        if (img) {
          const pr = lay.photo;
          const px = ox + pr.x * cellW;
          const py = oy + pr.y * cellH;
          const pw = pr.w * cellW;
          const ph = pr.h * cellH;
          const sc = Math.min(pw / img.width, ph / img.height);
          const iw = img.width * sc;
          const ih = img.height * sc;
          page.drawImage(img, {
            x: px,
            y: py + (ph - ih) / 2,
            width: iw,
            height: ih,
          });
        }
      }

      const lines = [
        { key: 'nom', label: 'Nom', bold: true },
        { key: 'prenoms', label: 'Prénoms', bold: true },
        { key: 'distrika', label: 'Distrika' },
        { key: 'eglizy', label: 'Eglizy' },
        {
          key: 'tokim_panompoana',
          label: 'Tokim-panompoana',
          fmt: (v) => (v ? String(v).slice(0, 10) : ''),
        },
        { key: 'matricule', label: 'Matricule', bold: true },
      ];

      for (const ln of lines) {
        const field = lay[ln.key === 'tokim_panompoana' ? 'tokim' : ln.key];
        if (!field) continue;
        const tx = ox + field.x * cellW;
        const ty = oy + field.y * cellH;
        const size = field.size || 10;
        const val =
          ln.fmt ? ln.fmt(m[ln.key]) : String(m[ln.key] == null ? '' : m[ln.key]);
        const text = `${ln.label}: ${val}`;
        page.drawText(text, {
          x: tx,
          y: ty,
          size,
          font: ln.bold ? fontBold : font,
          maxWidth: cellW * 0.58,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return pdf.save();
}
