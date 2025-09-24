// src/lib/pdf/certificate.js
import { jsPDF } from 'jspdf';

/**
 * Certificado de Autenticidad/Compra
 * @param {Object} d    Datos del pedido
 * @param {Object} opts { siteName, siteUrl, logoUrl }
 * @returns {{ filename: string, blob: Blob, base64: string }}
 */
export async function buildCertificatePDF(d = {}, opts = {}) {
  const { siteName = 'Arte Restauración Visuales', siteUrl = '', logoUrl = '' } = opts;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const margin = 50;

  // Borde
  pdf.setDrawColor(150);
  pdf.setLineWidth(1.2);
  pdf.rect(margin, margin, w - margin * 2, h - margin * 2);

  // Logo
  if (logoUrl) {
    try {
      const img = await fetch(logoUrl).then(r => r.blob()).then(b => new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(b);
      }));
      pdf.addImage(img, 'PNG', margin + 10, margin + 10, 80, 80, undefined, 'FAST');
    } catch {}
  }

  // Título
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text('Certificado de Autenticidad / Compra', w / 2, margin + 120, { align: 'center' });

  // Cuerpo
  const orderId  = d.pedido_id || (d.session_id ? String(d.session_id).slice(-10).toUpperCase() : '—');
  const date     = new Date().toLocaleDateString('es-MX');
  const buyer    = d.customer_name || '—';

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  const lines = [
    `Se certifica que el pedido ${orderId} fue adquirido por ${buyer} en la fecha ${date}.`,
    `Este documento avala la originalidad de la obra y/o productos adquiridos en ${siteName}.`,
    `Para cualquier aclaración, por favor visita ${siteUrl || 'nuestro sitio'}.`,
  ];
  let y = margin + 170;
  lines.forEach((t) => { pdf.text(t, margin + 20, y); y += 20; });

  // Firma
  y += 40;
  pdf.line(w / 2 - 120, y, w / 2 + 120, y);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Firma autorizada', w / 2, y + 16, { align: 'center' });

  const filename = `Certificado_${orderId}.pdf`;
  const blob     = pdf.output('blob');
  const base64   = pdf.output('datauristring'); // data:application/pdf;base64,...
  return { filename, blob, base64 };
}