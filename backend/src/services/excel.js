import xlsx from "xlsx";

const HEADER_ALIASES = {
  nom: ["nom", "name"],
  prenoms: ["prénoms", "prenoms", "prenom", "prénom"],
  distrika: ["distrika", "district"],
  eglizy: ["eglizy", "église", "eglise", "eglise "],
  tokim: [
    "tokim-panompoana",
    "tokim_panompoana",
    "tokim",
    "date ordination",
    "ordination",
  ],
  matricule: ["matricule", "matricule "],
  photo: ["photo", "photo_lien", "lien", "image", "url photo", "chemin photo"],
};

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapHeader(cell) {
  const h = norm(cell);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => h === norm(a))) return key;
  }
  return null;
}

/**
 * @param {Buffer} buffer
 */
export function parseMembresExcel(buffer) {
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) return { headers: [], rows: [] };

  const headerRow = rows[0].map((c) => String(c).trim());
  const colMap = {};
  headerRow.forEach((h, i) => {
    const k = mapHeader(h);
    if (k) colMap[k] = i;
  });

  const required = ["nom", "prenoms", "eglizy", "tokim"];
  const missing = required.filter((k) => colMap[k] === undefined);
  if (missing.length) {
    const err = new Error(
      `Colonnes manquantes dans l'Excel : ${missing.join(", ")}. En-têtes détectés : ${headerRow.join(" | ")}`,
    );
    err.code = "EXCEL_HEADERS";
    throw err;
  }

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    if (!line || !line.some((c) => String(c).trim())) continue;

    const get = (k) => {
      const idx = colMap[k];
      if (idx === undefined) return "";
      return line[idx];
    };

    let tokim = get("tokim");
    if (tokim instanceof Date) {
      tokim = tokim.toISOString().slice(0, 10);
    } else if (typeof tokim === "number" && tokim > 20000) {
      const epoch = new Date(Math.round((tokim - 25569) * 86400 * 1000));
      tokim = epoch.toISOString().slice(0, 10);
    } else {
      tokim = String(tokim || "").trim();
      const parsedDate = new Date(tokim);
      if (tokim && !Number.isNaN(parsedDate.getTime())) {
        tokim = parsedDate.toISOString().slice(0, 10);
      }
    }

    out.push({
      nom: String(get("nom") || "").trim(),
      prenoms: String(get("prenoms") || "").trim(),
      distrika: String(get("distrika") || "").trim(),
      eglizy: String(get("eglizy") || "").trim(),
      tokim_panompoana: tokim,
      matricule_manual: String(get("matricule") || "").trim() || null,
      photo_lien: String(get("photo") || "").trim() || null,
    });
  }

  return { headers: headerRow, rows: out };
}
