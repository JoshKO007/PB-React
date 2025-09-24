// src/lib/email/attachments.js

/**
 * Construye adjuntos para EmailJS a partir de dataURIs.
 * EmailJS espera base64 **puro** (sin el prefijo data:...).
 * Formato final: [{ name: 'archivo.pdf', data: 'JVBERi0xLjcKJc...' }]
 */
export function buildEmailJsAttachments(files = []) {
  return files
    .filter(Boolean)
    .map((f) => {
      const dataUri = f.base64 || ""; // viene de jsPDF: pdf.output('datauristring')
      const comma = dataUri.indexOf(",");
      // Si es un dataURI, quitamos "data:application/pdf;base64,"
      const base64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
      return {
        name: f.filename || "archivo.pdf",
        data: base64,
      };
    });
}