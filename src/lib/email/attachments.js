// src/lib/email/attachments.js

/**
 * Construye adjuntos para EmailJS a partir de dataURIs.
 * EmailJS acepta: [{ name: 'archivo.pdf', data: 'data:application/pdf;base64,JV...' }]
 */
export function buildEmailJsAttachments(files = []) {
  return files
    .filter(Boolean)
    .map((f) => ({ name: f.filename || 'archivo.pdf', data: f.base64 }));
}