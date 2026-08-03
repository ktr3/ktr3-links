import { normalizeCatalogUpdateRow } from "./catalog-update.js";

export function normalizeCatalogAdditionRow(rawRow) {
  const consentText = String(rawRow?.consentText || "").trim();
  if (consentText.length < 10 || consentText.length > 2000) {
    throw new Error("Catalog addition requires explicit consent text");
  }

  const submittedAt = new Date(rawRow?.submittedAt || "");
  if (Number.isNaN(submittedAt.getTime())) {
    throw new Error("Catalog addition requires a valid submission date");
  }

  const sourceRow = Number(rawRow?.sourceRow);
  if (!Number.isInteger(sourceRow) || sourceRow < 1) {
    throw new Error("Catalog addition requires a positive source row");
  }

  const bio = String(rawRow?.bio || "").trim() || null;
  if (bio && bio.length > 2000) {
    throw new Error("Catalog addition bio cannot exceed 2000 characters");
  }

  return {
    ...normalizeCatalogUpdateRow(rawRow),
    sourceRow,
    submittedAt,
    consentText,
    bio,
  };
}

export function parseCatalogAdditionsPayload(text) {
  const payload = JSON.parse(text);
  if (!Array.isArray(payload.rows)) {
    throw new Error("Catalog additions payload must include a rows array");
  }
  const source = String(payload.source || "").trim();
  if (!source || source.length > 160) {
    throw new Error("Catalog additions payload requires a source label");
  }
  return {
    source,
    rows: payload.rows.map(normalizeCatalogAdditionRow),
  };
}
