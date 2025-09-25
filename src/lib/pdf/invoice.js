// src/lib/pdf/invoice.js
import jsPDF from "jspdf";

/**
 * Carga una imagen remota, obtiene sus dimensiones y la retorna como dataURL base64.
 */
async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    const blob = await res.blob();
    const dataURL = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    const dimensions = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 0, h: 0 }); // Manejo de error
      img.src = dataURL;
    });

    return { dataURL, ...dimensions };
  } catch {
    return null;
  }
}

/**
 * Formatea un número como moneda mexicana.
 */
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
    logoUrl = "",
    currencySymbol = "$",
    // por si también llegan por options:
    shippingAddress: optShippingAddress,
    shippingAddressText: optShippingAddressText,
  } = opts;

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true }); // 595 x 842
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // --- ESTILOS Y COLORES ---
  const brand = {
    primary: [161, 98, 7],
    primaryLight: [253, 242, 233], // Un tono más claro para fondos
    text: [33, 37, 41],
    mute: [108, 117, 125],
    white: [255, 255, 255],
  };
  const lineGray = [222, 226, 230];
  const M = 48; // Margen
  let y = M;

  // --- ENCABEZADO ---
  const logo = await fetchImage(logoUrl);
  const maxLogoW = 120;
  let logoH = 0;
  if (logo && logo.w > 0) {
    const aspectRatio = logo.h / logo.w;
    logoH = maxLogoW * aspectRatio;
  }
  const headerHeight = (logoH > 0 ? logoH : 40) + 24;
  
  doc.setFillColor(...brand.primaryLight);
  doc.rect(0, 0, pageW, headerHeight + M, 'F');

  if (logo) {
    doc.addImage(logo.dataURL, "PNG", M, y, maxLogoW, logoH);
  }

  const headerCenterY = y + headerHeight / 2 - 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...brand.text);
  doc.text(siteName, pageW - M, headerCenterY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...brand.mute);
  doc.text(siteUrl, pageW - M, headerCenterY + 16, { align: "right" });
  
  y += headerHeight + 32;

  // --- TÍTULO Y DATOS DEL RECIBO ---
  const orderId = order.pedido_id || "—";
  const orderDate = order.order_date || new Date().toLocaleString("es-MX", { dateStyle: "long" });

  doc.setFillColor(...brand.primary);
  doc.roundedRect(M, y - 8, 80, 24, 4, 4, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...brand.white);
  doc.text("RECIBO", M + 12, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...brand.mute);
  doc.text(`Pedido No: ${orderId}`, pageW - M, y, { align: "right" });
  doc.text(`Fecha: ${orderDate}`, pageW - M, y + 14, { align: "right" });

  y += 50;

  // --- DATOS DE ENVÍO ---
  const leftColX = M;
  const rightColX = pageW / 2 + 20;
  const colY = y;

  // Dirección puede venir de:
  // - Campos planos (shipping_*)
  // - Objeto Stripe-like: order.shipping.{name,line1,line2,city,state,postal_code,country}
  // - Objeto propio guardado: order.shipping_address u options.shippingAddress {nombre, calle, ciudad, estado, cp, pais, referencia}
  // - Texto listo para imprimir: order.shipping_address_text u options.shippingAddressText
  const savedAddrObj =
    order.shipping_address ||
    optShippingAddress ||
    null;

  const savedAddrText =
    order.shipping_address_text ||
    optShippingAddressText ||
    null;

  // Construir líneas de dirección
  const computeLinesFromSaved = (a) => {
    if (!a || typeof a !== "object") return null;
    const nombre = a.nombre || a.name || order.customer_name || "—";
    const l1 = a.calle || a.line1 || "";
    const l2 = a.referencia || a.line2 || "";
    const city = a.ciudad || a.city || "";
    const state = a.estado || a.state || "";
    const cp = a.cp || a.postal_code || a.postal || "";
    const country = a.pais || a.country || "MX";
    const cs = [city, state].filter(Boolean).join(", ");
    const tail = [country, cp ? `CP ${cp}` : ""].filter(Boolean).join(" · ");
    return [nombre, l1, l2, cs, tail].filter(Boolean);
  };

  const shipName =
    order.shipping_name ||
    order.shipping?.name ||
    savedAddrObj?.nombre ||
    order.customer_name ||
    "—";

  const fallbackLine1 =
    order.shipping_line1 || order.shipping?.line1 || savedAddrObj?.calle || "—";

  const fallbackLine2 =
    order.shipping_line2 || order.shipping?.line2 || savedAddrObj?.referencia || "";

  const fallbackCityState = `${order.shipping_city || order.shipping?.city || savedAddrObj?.ciudad || "—"}, ` +
                            `${order.shipping_state || order.shipping?.state || savedAddrObj?.estado || "—"}`;

  const fallbackCountry = (order.shipping_country || order.shipping?.country || savedAddrObj?.pais || "MX");
  const fallbackPostal  = (order.shipping_postal_code || order.shipping?.postal_code || savedAddrObj?.cp || "—");
  const fallbackTail    = [fallbackCountry, fallbackPostal ? `CP ${fallbackPostal}` : ""].filter(Boolean).join(" · ");

  let addressLines = null;

  if (typeof savedAddrText === "string" && savedAddrText.trim()) {
    // Texto preformateado (de Recibo.jsx)
    addressLines = savedAddrText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } else if (savedAddrObj) {
    // Objeto guardado propio
    addressLines = computeLinesFromSaved(savedAddrObj);
  } else {
    // Fallback: combinar campos planos / objeto tipo Stripe si existen
    addressLines = [shipName, fallbackLine1, fallbackLine2, fallbackCityState, fallbackTail]
      .map(s => String(s || "").trim())
      .filter(Boolean);
  }

  const method = order.shipping_metodo === "retiro" ? "Retiro en taller" :
                 order.shipping_metodo === "express" ? "Envío express" : "Envío estándar";

  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...brand.primary);
  doc.text("ENVIAR A", leftColX, colY);
  
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...brand.text);
  let yAddr = colY + 16;

  // Imprimir dirección con ajuste de ancho
  const addrMaxWidth = pageW / 2 - (M + 10);
  addressLines.forEach(line => {
    const lines = doc.splitTextToSize(line, addrMaxWidth);
    lines.forEach(l => {
      doc.text(l, leftColX, yAddr);
      yAddr += 14;
    });
  });
  
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...brand.primary);
  doc.text("MÉTODO DE ENVÍO", rightColX, colY);
  
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...brand.text);
  doc.text(method, rightColX, colY + 16);
  
  y = yAddr + 18;

  // --- TABLA DE ARTÍCULOS ---
  doc.setDrawColor(...lineGray);
  doc.line(M, y, pageW - M, y);
  y += 18;

  const colX = {
    item: M,
    qty: pageW - M - 220,
    price: pageW - M - 140,
    amount: pageW - M,
  };

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...brand.mute);
  doc.setFontSize(9);
  doc.text("ARTÍCULO", colX.item, y);
  doc.text("CANT.", colX.qty, y, { align: "right" });
  doc.text("PRECIO UNIT.", colX.price, y, { align: "right" });
  doc.text("IMPORTE", colX.amount, y, { align: "right" });
  y += 8;
  doc.line(M, y, pageW - M, y);

  const items = Array.isArray(order.line_items) ? order.line_items : [];
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...brand.text);
  doc.setFontSize(10);

  const rowH = 22;
  items.forEach((it, idx) => {
    y += rowH;
    // Zebra stripes
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(M, y - rowH + 6, pageW - 2 * M, rowH, "F");
    }
    const qty = Number(it.quantity || 1);
    const unit = Number(it.unit_amount_mxn || 0);
    const imp = qty * unit;
    const name = it.title || "Artículo";

    doc.text(name, colX.item + 2, y); // +2 for slight padding
    doc.text(String(qty), colX.qty, y, { align: "right" });
    doc.text(`${currencySymbol}${money(unit)}`, colX.price, y, { align: "right" });
    doc.text(`${currencySymbol}${money(imp)}`, colX.amount, y, { align: "right" });
  });

  // --- TOTALES ---
  const subtotal = Number(order.subtotal_mxn || 0);
  const envio = Number(order.envio_mxn || 0);
  const fee = Number(order.fee_mxn || 0);
  const taxPct = Number(order.tax_pct || 0);
  const taxAmt = taxPct > 0 ? (subtotal + envio + fee) * (taxPct / 100) : 0;
  const total = Number(order.total_mxn || 0);

  const boxW = 260;
  const boxH = 118 + (taxPct > 0 ? 18 : 0);
  const boxX = pageW - M - boxW;
  const boxY = Math.min(pageH - M - boxH - 60, y + 28); // Dejar espacio para el footer
  
  doc.setDrawColor(...lineGray);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, "FD");

  let yb = boxY + 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...brand.text);
  doc.text("Resumen de pago", boxX + 14, yb);
  
  doc.setFont("helvetica", "normal"); doc.setTextColor(...brand.text);
  yb += 20; doc.text("Subtotal", boxX + 14, yb);
  doc.text(`${currencySymbol}${money(subtotal)}`, boxX + boxW - 14, yb, { align: "right" });

  yb += 16; doc.text(`Envío`, boxX + 14, yb);
  doc.text(`${currencySymbol}${money(envio)}`, boxX + boxW - 14, yb, { align: "right" });
  
  yb += 16; doc.text("Cargo por procesamiento", boxX + 14, yb);
  doc.text(`${currencySymbol}${money(fee)}`, boxX + boxW - 14, yb, { align: "right" });

  if (taxPct > 0) {
    yb += 16; doc.text(`Impuestos (${taxPct}%)`, boxX + 14, yb);
    doc.text(`${currencySymbol}${money(taxAmt)}`, boxX + boxW - 14, yb, { align: "right" });
  }

  doc.setDrawColor(...lineGray);
  yb += 10; doc.line(boxX + 14, yb, boxX + boxW - 14, yb);
  yb += 16; doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Total", boxX + 14, yb);
  doc.text(`${currencySymbol}${money(total)}`, boxX + boxW - 14, yb, { align: "right" });

  // --- PIE DE PÁGINA ---
  const footerY = pageH - M;
  doc.setDrawColor(...lineGray);
  doc.line(M, footerY - 24, pageW - M, footerY - 24);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...brand.primary);
  doc.text("¡Gracias por tu compra!", pageW / 2, footerY - 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...brand.mute);
  doc.text(`${siteName} · ${siteUrl}`, pageW / 2, footerY + 12, { align: "center" });

  const base64 = doc.output("datauristring");
  return {
    filename: `Recibo_${orderId}.pdf`,
    base64,
  };
}
