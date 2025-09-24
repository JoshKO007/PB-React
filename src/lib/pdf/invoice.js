// src/lib/pdf/invoice.js
import jsPDF from "jspdf";

/**
 * Carga una imagen remota y la retorna como dataURL base64
 */
async function fetchImageAsDataURL(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function money(n = 0) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

export async function buildInvoicePDF(order, opts = {}) {
  const {
    siteName = "Arte Restauración Visuales",
    siteUrl = "",
    logoUrl = "",               // ✅ ahora usamos logo
    currencySymbol = "$",
  } = opts;

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true }); // 595 x 842
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Colores y estilos
  const brand = { primary: [161, 98, 7], text: [33, 37, 41], mute: [108, 117, 125] };
  const lineGray = [230, 232, 236];

  // Margen
  const M = 48;
  let y = M;

  // Logo + Encabezado
  const logoDataURL = await fetchImageAsDataURL(logoUrl);
  if (logoDataURL) {
    // ancho max 120pt, preservando proporción
    doc.addImage(logoDataURL, "PNG", M, y, 120, 120 * 0.7);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...brand.text);
  doc.text(siteName, pageW - M, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...brand.mute);
  doc.text(siteUrl, pageW - M, y + 26, { align: "right" });

  // Línea
  y += 48;
  doc.setDrawColor(...lineGray);
  doc.line(M, y, pageW - M, y);
  y += 24;

  // Datos de la factura
  const orderId = order.pedido_id || "—";
  const orderDate =
    order.order_date ||
    new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  doc.setFontSize(12);
  doc.setTextColor(...brand.text);
  doc.setFont("helvetica", "bold");
  doc.text("Factura", M, y);
  doc.setFont("helvetica", "normal");
  y += 18;
  doc.text(`Pedido: ${orderId}`, M, y);
  y += 16;
  doc.text(`Fecha: ${orderDate}`, M, y);

  // Caja de shipping/billing
  const leftColX = M;
  const rightColX = pageW / 2;

  const shipName = order.shipping_name || order.shipping?.name || order.customer_name || "—";
  const shipL1   = order.shipping_line1 || order.shipping?.line1 || "—";
  const shipL2   = order.shipping_line2 || order.shipping?.line2 || "";
  const shipCSZ  = `${order.shipping_city || order.shipping?.city || "—"}, ` +
                   `${order.shipping_state || order.shipping?.state || "—"} ` +
                   `${order.shipping_postal_code || order.shipping?.postal_code || "—"}`;
  const shipCountry = order.shipping_country || order.shipping?.country || "MX";

  const method = order.shipping_metodo === "retiro" ? "Retiro en taller" :
                 order.shipping_metodo === "express" ? "Envío express" : "Envío estándar";

  y += 26;
  doc.setFont("helvetica", "bold"); doc.text("Envío a", leftColX, y);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...brand.text);
  y += 16; doc.text(shipName, leftColX, y);
  y += 14; doc.text(shipL1, leftColX, y);
  if (shipL2) { y += 14; doc.text(shipL2, leftColX, y); }
  y += 14; doc.text(shipCSZ, leftColX, y);
  y += 14; doc.text(shipCountry, leftColX, y);

  doc.setFont("helvetica", "bold"); doc.text("Método de envío", rightColX, y - 56);
  doc.setFont("helvetica", "normal"); doc.text(method, rightColX, y - 40);

  // Tabla de items
  y += 24;
  doc.setDrawColor(...lineGray);
  doc.line(M, y, pageW - M, y);
  y += 18;

  const colX = {
    item: M,
    qty: pageW - M - 220,
    price: pageW - M - 140,
    amount: pageW - M - 40,
  };

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...brand.mute);
  doc.text("Artículo", colX.item, y);
  doc.text("Cant.", colX.qty, y, { align: "right" });
  doc.text("Precio", colX.price, y, { align: "right" });
  doc.text("Importe", colX.amount, y, { align: "right" });

  y += 10;
  doc.setDrawColor(...lineGray);
  doc.line(M, y, pageW - M, y);

  const items = Array.isArray(order.line_items) ? order.line_items : [];
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...brand.text);

  const rowH = 18;
  items.forEach((it, idx) => {
    const qty = Number(it.quantity || 1);
    const unit = Number(it.unit_amount_mxn || 0);
    const imp = qty * unit;

    y += rowH;
    // zebra
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(M, y - rowH + 4, pageW - 2 * M, rowH, "F");
    }
    const name = it.title || "Artículo";

    doc.text(name, colX.item, y);
    doc.text(String(qty), colX.qty, y, { align: "right" });
    doc.text(`${currencySymbol}${money(unit)}`, colX.price, y, { align: "right" });
    doc.text(`${currencySymbol}${money(imp)}`, colX.amount, y, { align: "right" });
  });

  // Totales en una cajita
  const subtotal = Number(order.subtotal_mxn || 0);
  const envio    = Number(order.envio_mxn || 0);
  const fee      = Number(order.fee_mxn || 0);
  const taxPct   = Number(order.tax_pct || 0);
  const taxAmt   = taxPct > 0 ? (subtotal + envio + fee) * (taxPct / 100) : 0;
  const total    = Number(order.total_mxn || 0);

  const boxW = 260;
  const boxH = 118 + (taxPct > 0 ? 18 : 0);
  const boxX = pageW - M - boxW;
  const boxY = Math.min(pageH - M - boxH, y + 28);

  doc.setDrawColor(...lineGray);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8, "FD");

  let yb = boxY + 18;
  doc.setFont("helvetica", "bold"); doc.setTextColor(...brand.text);
  doc.text("Resumen", boxX + 14, yb);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...brand.text);

  yb += 18; doc.text("Subtotal", boxX + 14, yb);
  doc.text(`${currencySymbol}${money(subtotal)}`, boxX + boxW - 14, yb, { align: "right" });

  yb += 16; doc.text(`Envío (${method})`, boxX + 14, yb);
  doc.text(`${currencySymbol}${money(envio)}`, boxX + boxW - 14, yb, { align: "right" });

  yb += 16; doc.text("Cargo por procesamiento", boxX + 14, yb);
  doc.text(`${currencySymbol}${money(fee)}`, boxX + boxW - 14, yb, { align: "right" });

  if (taxPct > 0) {
    yb += 16; doc.text(`Impuestos (${taxPct}%)`, boxX + 14, yb);
    doc.text(`${currencySymbol}${money(taxAmt)}`, boxX + boxW - 14, yb, { align: "right" });
  }

  doc.setDrawColor(...lineGray);
  yb += 10; doc.line(boxX + 14, yb, boxX + boxW - 14, yb);
  yb += 16; doc.setFont("helvetica", "bold");
  doc.text("Total", boxX + 14, yb);
  doc.text(`${currencySymbol}${money(total)}`, boxX + boxW - 14, yb, { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...brand.mute);
  doc.text(`${siteName} · ${siteUrl}`, M, pageH - M);

  const base64 = doc.output("datauristring"); // data:application/pdf;base64,...
  return {
    filename: `Factura_${orderId}.pdf`,
    base64,
  };
}
