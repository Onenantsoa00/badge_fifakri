import fs from "fs";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  popGraphicsState,
  pushGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
  rgb,
} from "pdf-lib";

/** A4 portrait (72 dpi) */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const COLS = 2;
const ROWS = 6;

/** Espacement minimal entre badges (haut/bas) */
const ROW_GAP = 0;

/**
 * Proportions badge : largeur 10,5 cm / longueur 7,95 cm (+3 cm vs 4,95 cm)
 * Ajusté pour tenir sur A4 en 2×6
 */
const BADGE_WH_RATIO = 140 / 79.5;

const PHOTO_CLIP_INSET = 0;

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const DEFAULT_LAYOUT = {
  photo: { cx: 0.237, cy: 0.495, r: 0.28 },
  nom: {
    x: 0.2,
    y: 0.84,
    size: 10,
    align: "center",
    regionX: 0.34,
    regionW: 0.64,
  },
  prenoms: {
    x: 0.2,
    y: 0.76,
    size: 10,
    align: "center",
    regionX: 0.34,
    regionW: 0.64,
  },
  distrika: { x: 0.4, y: 0.61, size: 9 },
  eglizy: { x: 0.4, y: 0.52, size: 9 },
  tokim: { x: 0.4, y: 0.43, size: 9 },
  matricule: { x: 0.4, y: 0.34, size: 8.3 },
};

function computeBadgeSize() {
  let badgeH = (PAGE_H - (ROWS - 1) * ROW_GAP) / ROWS;
  let badgeW = badgeH * BADGE_WH_RATIO;
  const colW = PAGE_W / COLS;
  if (badgeW > colW) {
    badgeW = colW;
    badgeH = badgeW / BADGE_WH_RATIO;
  }
  return { badgeW, badgeH, colW };
}

function circleSvgPath(cx, cy, r) {
  return `M ${cx},${cy - r} A ${r} ${r} 0 0 1 ${cx},${cy + r} A ${r} ${r} 0 0 1 ${cx},${cy - r} Z`;
}

function resolvePhotoCircle(ox, oy, badgeW, badgeH, pr) {
  const unit = Math.min(badgeW, badgeH);
  let cx;
  let cy;
  let r;
  if (pr.cx != null && pr.cy != null && pr.r != null) {
    cx = ox + pr.cx * badgeW;
    cy = oy + pr.cy * badgeH;
    r = pr.r * unit * (1 - PHOTO_CLIP_INSET);
  } else {
    const px = ox + (pr.x || 0) * badgeW;
    const py = oy + (pr.y || 0) * badgeH;
    const pw = (pr.w || 0.28) * badgeW;
    const ph = (pr.h || 0.28) * badgeH;
    const side = Math.min(pw, ph);
    cx = px + pw / 2;
    cy = py + ph / 2;
    r = (side / 2) * (1 - PHOTO_CLIP_INSET);
  }
  return { cx, cy, r };
}

async function loadImageBytes(photoLien) {
  if (!photoLien) return null;
  const s = String(photoLien).trim();
  if (!s) return null;
  // data URI (base64)
  if (s.startsWith("data:image/")) {
    const idx = s.indexOf("base64,");
    if (idx === -1) return null;
    const b64 = s.slice(idx + 7);
    return Buffer.from(b64, "base64");
  }

  // remote URL
  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("//")
  ) {
    const url = s.startsWith("//") ? `https:${s}` : s;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      return null;
    }
  }

  // try as absolute or resolved path
  const abs = path.isAbsolute(s) ? s : path.resolve(s);
  if (fs.existsSync(abs)) return fs.readFileSync(abs);

  // try relative to upload directory (useful in production)
  const candidate = path.resolve(UPLOAD_ROOT, s);
  if (fs.existsSync(candidate)) return fs.readFileSync(candidate);

  // fallback: try resolving relative to process.cwd() once more with a join
  const candidate2 = path.resolve(process.cwd(), s);
  if (fs.existsSync(candidate2)) return fs.readFileSync(candidate2);

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
  const { badgeW, badgeH, colW } = computeBadgeSize();
  const perPage = COLS * ROWS;
  const slotH = badgeH + ROW_GAP;

  for (let p = 0; p < membres.length; p += perPage) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const chunk = membres.slice(p, p + perPage);

    for (let i = 0; i < chunk.length; i++) {
      const col = i < ROWS ? 0 : 1;
      const rowFromTop = i < ROWS ? i : i - ROWS;
      const ox = col * colW + (colW - badgeW) / 2;
      const oy = PAGE_H - (rowFromTop + 1) * slotH;
      const m = chunk[i];

      if (tplImage) {
        const ir = tplImage.scale(1);
        const scale = Math.min(badgeW / ir.width, badgeH / ir.height);
        const dw = ir.width * scale;
        const dh = ir.height * scale;
        const dx = ox + (badgeW - dw) / 2;
        const dy = oy + (badgeH - dh) / 2;
        page.drawImage(tplImage, { x: dx, y: dy, width: dw, height: dh });
      } else {
        page.drawRectangle({
          x: ox + 2,
          y: oy + 2,
          width: badgeW - 4,
          height: badgeH - 4,
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
          const { cx, cy, r } = resolvePhotoCircle(
            ox,
            oy,
            badgeW,
            badgeH,
            lay.photo,
          );

          const diameter = r * 2;

          // agrandissement image
          const scale = Math.max(diameter / img.width, diameter / img.height);

          const imgW = img.width * scale;
          const imgH = img.height * scale;

          const imgX = cx - imgW / 2;
          const imgY = cy - imgH / 2;

          // sauvegarde état graphique
          page.pushOperators(pushGraphicsState());

          // création vrai masque cercle
          const steps = 40;
          const points = [];

          for (let i = 0; i <= steps; i++) {
            const angle = (Math.PI * 2 * i) / steps;
            points.push({
              x: cx + r * Math.cos(angle),
              y: cy + r * Math.sin(angle),
            });
          }

          const ops = [];

          ops.push(moveTo(points[0].x, points[0].y));

          for (let i = 1; i < points.length; i++) {
            ops.push(lineTo(points[i].x, points[i].y));
          }

          ops.push(closePath());
          ops.push(clip());
          ops.push(endPath());

          page.pushOperators(...ops);

          // dessin image
          page.drawImage(img, {
            x: imgX,
            y: imgY,
            width: imgW,
            height: imgH,
          });

          // restauration
          page.pushOperators(popGraphicsState());
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
        let tx = ox + field.x * badgeW;
        if (field.align === "center") {
          const textWidth = fontToUse.widthOfTextAtSize(val, size);
          const regionX =
            field.regionX != null ? ox + field.regionX * badgeW : ox;
          const regionW =
            field.regionW != null ? field.regionW * badgeW : badgeW;
          tx = regionX + (regionW - textWidth) / 2;
        }
        const ty = oy + field.y * badgeH;

        if (ln.noLabel) {
          page.drawText(val, {
            x: tx,
            y: ty,
            size,
            font: fontToUse,
            maxWidth: badgeW * 0.92,
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
          maxWidth: badgeW * 0.56 - labelWidth,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return pdf.save();
}
