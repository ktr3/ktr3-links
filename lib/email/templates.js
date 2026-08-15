function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function resourceDeliveryEmail({
  name,
  resourceTitle,
  downloadUrl,
  confirmationUrl,
}) {
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,";
  const confirmationBlock = confirmationUrl
    ? `
      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #34264a">
        <p style="margin:0 0 14px;color:#cfc5df">Marcaste que quieres recibir nuevos recursos y tips. Confirma esa suscripción aquí:</p>
        <a href="${escapeHtml(confirmationUrl)}" style="color:#b77cff;text-decoration:underline">Confirmar tips de Ktr3</a>
      </div>`
    : "";

  return {
    subject: `${resourceTitle} — descarga de Ktr3`,
    text: [
      greeting,
      "",
      `Aquí tienes ${resourceTitle}:`,
      downloadUrl,
      "",
      confirmationUrl ? `Confirma los tips de Ktr3: ${confirmationUrl}` : "",
      "",
      "Gracias por formar parte de la comunidad.",
      "Ktr3",
    ].filter(Boolean).join("\n"),
    html: `
      <!doctype html>
      <html lang="es">
        <body style="margin:0;background:#08060d;color:#f7f3ff;font-family:Arial,sans-serif">
          <div style="max-width:620px;margin:0 auto;padding:40px 24px">
            <div style="font:700 13px monospace;letter-spacing:.14em;color:#b77cff">KTR3://RESOURCES</div>
            <h1 style="font-size:30px;margin:16px 0 12px">${escapeHtml(resourceTitle)}</h1>
            <p style="color:#cfc5df;line-height:1.6">${greeting} el recurso ya está preparado.</p>
            <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;margin-top:14px;padding:14px 20px;border-radius:10px;background:#9f5cff;color:#fff;text-decoration:none;font-weight:700">Descargar recurso</a>
            <p style="margin-top:18px;color:#83778f;font-size:13px">El enlace caduca por seguridad. Puedes solicitar uno nuevo desde ktr3.es/recursos.</p>
            ${confirmationBlock}
            <p style="margin-top:34px;color:#83778f;font-size:13px">Creado por Ktr3 para productores.</p>
          </div>
        </body>
      </html>
    `,
  };
}
