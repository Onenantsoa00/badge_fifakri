import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** A4 portrait en points (72 dpi) */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const COLS = 2;
const ROWS = 6;

const DEFAULT_LAYOUT = {
  photo: { x: 0.05, y: 0.1, w: 0.3, h: 0.62 },
  nom: { x: 0.5, y: 0.82, size: 11, align: "center" },
  prenoms: { x: 0.5, y: 0.74, size: 11, align: "center" },
  distrika: { x: 0.38, y: 0.62, size: 9 },
  eglizy: { x: 0.38, y: 0.52, size: 9 },
  tokim: { x: 0.38, y: 0.36, size: 9 },
  matricule: { x: 0.38, y: 0.18, size: 10 },
};

async function loadImageBytes(photoLien) {
  if (!photoLien) return null;
  const s = String(photoLien).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) {
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

function formatShortDate(value) {
  if (value == null) return "";
  const d = new Date(String(value).trim());
  if (Number.isNaN(d.getTime())) return String(value).trim();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
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
        { key: "nom", noLabel: true, bold: true },
        { key: "prenoms", noLabel: true, bold: true },
        { key: "distrika", label: "Distrika" },
        { key: "eglizy", label: "Eglizy" },
        {
          key: "tokim_panompoana",
          label: "Tokim-panompoana",
          fmt: formatShortDate,
        },
        { key: "matricule", label: "Matricule" },
      ];

      for (const ln of lines) {
        const field = lay[ln.key === "tokim_panompoana" ? "tokim" : ln.key];
        if (!field) continue;
        const size = field.size || 10;
        const rawValue = m[ln.key];
        const val = ln.fmt
          ? ln.fmt(rawValue)
          : String(rawValue == null ? "" : rawValue);
        const fontToUse = ln.bold ? fontBold : font;
        let tx = ox + field.x * cellW;
        if (field.align === "center") {
          const textWidth = fontToUse.widthOfTextAtSize(val, size);
          tx = ox + (cellW - textWidth) / 2;
        }
        const ty = oy + field.y * cellH;

        if (ln.noLabel) {
          page.drawText(val, {
            x: tx,
            y: ty,
            size,
            font: fontToUse,
            maxWidth: cellW * 0.9,
            color: rgb(0.1, 0.1, 0.1),
          });
          continue;
        }

        const labelText = `${ln.label}: `;
        const labelWidth = font.widthOfTextAtSize(labelText, size);
        page.drawText(labelText, {
          x: tx,
          y: ty,
          size,
          font: fontToUse,
          color: rgb(0.1, 0.1, 0.1),
        });
        page.drawLine({
          start: { x: tx, y: ty - 1 },
          end: { x: tx + labelWidth, y: ty - 1 },
          thickness: 0.5,
          color: rgb(0.1, 0.1, 0.1),
        });
        page.drawText(val, {
          x: tx + labelWidth,
          y: ty,
          size,
          font: fontToUse,
          maxWidth: cellW * 0.58 - labelWidth,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return pdf.save();
}
