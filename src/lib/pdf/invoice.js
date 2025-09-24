// src/lib/pdf/invoice.js
import { jsPDF } from 'jspdf';

function toMoney(n, locale = 'es-MX') {
  const num = Number.isFinite(Number(n)) ? Number(n) : 0;
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

/**
 * Factura simple en PDF
 * @param {Object} d   Datos del pedido (de tu finalize-order)
 * @param {Object} opts { siteName, siteUrl, logoUrl, currencySymbol }
 * @returns {{ filename: string, blob: Blob, base64: string }}
 */
export async function buildInvoicePDF(d = {}, opts = {}) {
  const {
    siteName = 'Arte Restauración Visuales',
    siteUrl = '',
    logoUrl = '',
    currencySymbol = '$',
  } = opts;

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = pdf.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Logo + encabezado
  if (logoUrl) {
    try {
      const img = await fetch(logoUrl).then(r => r.blob()).then(b => new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(b);
      }));
      pdf.addImage(img, 'PNG', margin, y, 80, 80, undefined, 'FAST');
    } catch {}
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(siteName, margin + 90, y + 22);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  if (siteUrl) pdf.text(siteUrl, margin + 90, y + 38);

  pdf.setFontSize(16);
  pdf.text('Factura', width - margin - 80, y + 18, { align: 'right' });

  y += 90;
  pdf.setDrawColor(200);
  pdf.line(margin, y, width - margin, y);
  y += 16;

  // Meta
  const orderId    = d.pedido_id || (d.session_id ? String(d.session_id).slice(-10).toUpperCase() : '—');
  const orderDate  = new Date().toLocaleString('es-MX');
  const clientName = d.customer_name || '—';
  const clientMail = d.customer_email || '—';

  pdf.setFontSize(11);
  pdf.text(`Pedido: ${orderId}`, margin, y);
  pdf.text(`Fecha: ${orderDate}`, margin, y + 16);
  pdf.text(`Cliente: ${clientName}`, width/2, y);
  pdf.text(`Email: ${clientMail}`, width/2, y + 16);
  y += 48;

  // Tabla
  const th   = ['Artículo', 'Cant.', 'Precio', 'Importe'];
  const colW = [width * 0.45, width * 0.12, width * 0.18, width * 0.18];
  const startX = margin;

  pdf.setFillColor(245);
  pdf.rect(startX, y, width - margin * 2, 22, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  let x = startX + 8;
  th.forEach((t, idx) => { pdf.text(t, x, y + 15); x += colW[idx]; });
  y += 26;

  pdf.setFont('helvetica', 'normal');
  const items = Array.isArray(d.line_items) ? d.line_items : [];
  items.forEach((it) => {
    const qty  = Number(it?.quantity) || 1;
    const unit = Number(it?.unit_amount_mxn) || 0;
    const imp  = qty * unit;
    let colX = startX + 8;
    const rowH = 18;
    pdf.text(String(it?.title || 'Artículo'), colX, y + 12); colX += colW[0];
    pdf.text(String(qty),                     colX, y + 12); colX += colW[1];
    pdf.text(`${currencySymbol}${toMoney(unit)}`, colX, y + 12); colX += colW[2];
    pdf.text(`${currencySymbol}${toMoney(imp)}`,  colX, y + 12);
    y += rowH;
  });

  // Totales
  y += 8;
  pdf.setDrawColor(220);
  pdf.line(margin, y, width - margin, y);
  y += 20;

  const subtotal = Number(d.subtotal_mxn) || 0;
  const shipping = Number(d.envio_mxn)    || 0;
  const fee      = Number(d.fee_mxn)      || 0;
  const taxPct   = Number(d.tax_pct)      || 0;
  const taxAmount = taxPct > 0 ? (subtotal + shipping + fee) * (taxPct / 100) : 0;
  const total = Number(d.total_mxn) || (subtotal + shipping + fee + taxAmount);

  const totals = [
    ['Subtotal', subtotal],
    ['Envío', shipping],
    ['Cargo por procesamiento', fee],
  ];
  if (taxPct > 0) totals.push([`Impuestos (${taxPct}%)`, taxAmount]);
  totals.push(['Total', total]);

  const totalsX = width - margin - 220;
  totals.forEach(([label, val], idx) => {
    const isLast = idx === totals.length - 1;
    pdf.setFont('helvetica', isLast ? 'bold' : 'normal');
    pdf.text(label, totalsX, y + idx * 18);
    pdf.text(`${currencySymbol}${toMoney(val)}`, totalsX + 160, y + idx * 18, { align: 'right' });
  });

  // Footer
  const footerY = 800;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.text('Gracias por tu compra.', margin, footerY);

  const filename = `Factura_${orderId}.pdf`;
  const blob     = pdf.output('blob');
  const base64   = pdf.output('datauristring'); // data:application/pdf;base64,...
  return { filename, blob, base64 };
}