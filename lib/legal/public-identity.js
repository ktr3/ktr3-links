const LEGAL_FIELDS = [
  "PUBLIC_LEGAL_NAME",
  "PUBLIC_LEGAL_TAX_ID",
  "PUBLIC_LEGAL_ADDRESS",
  "PUBLIC_LEGAL_EMAIL",
];

export function publicLegalIdentity(environment = process.env) {
  const values = Object.fromEntries(
    LEGAL_FIELDS.map((field) => [field, String(environment[field] || "").trim()]),
  );

  return {
    name: values.PUBLIC_LEGAL_NAME,
    taxId: values.PUBLIC_LEGAL_TAX_ID,
    address: values.PUBLIC_LEGAL_ADDRESS,
    email: values.PUBLIC_LEGAL_EMAIL || "prod.ktr3@gmail.com",
    complete: LEGAL_FIELDS.every((field) => Boolean(values[field])),
  };
}
