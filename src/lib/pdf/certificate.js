// src/lib/pdf/certificate.js
import jsPDF from "jspdf";

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

/**
 * Generador de certificado (A4 landscape), con marco, medallón, caja central,
 * banda inferior pegada al marco y firma centrada.
 */
export async function buildCertificatePDF(order, opts = {}) {
  const {
    siteName = "Arte Restauración Visuales",
    siteUrl = "",
    logoUrl = "",
  } = opts;

  // Horizontal A4
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Paleta
  const gold = [168, 134, 64];
  const goldSoft = [222, 200, 160];
  const ink = [43, 45, 66];
  const mute = [120, 120, 120];
  const line = [210, 210, 210];

  const M = 48; // margen interior del marco

  // Marco decorativo (doble borde)
  doc.setDrawColor(...gold);
  doc.setLineWidth(2.2);
  doc.roundedRect(M, M, pageW - 2 * M, pageH - 2 * M, 16, 16);

  doc.setDrawColor(...goldSoft);
  doc.setLineWidth(0.8);
  doc.roundedRect(M + 10, M + 10, pageW - 2 * (M + 10), pageH - 2 * (M + 10), 12, 12);

  // Líneas suaves para separar zonas
  doc.setDrawColor(...line);
  doc.setLineWidth(0.6);
  doc.line(M + 26, M + 64, pageW - M - 26, M + 64);
  doc.line(M + 26, pageH - M - 64, pageW - M - 26, pageH - M - 64);

  // Logo como medallón centrado en la parte superior
  const logo = await fetchImageAsDataURL(logoUrl);
  if (logo) {
    const badgeSize = 96;
    const badgeX = pageW / 2 - badgeSize / 2;
    const badgeY = M + 22;

    // fondo circular blanco y borde suave
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW / 2, badgeY + badgeSize / 2, badgeSize / 2 + 14, "F");
    doc.setDrawColor(...goldSoft);
    doc.setLineWidth(1.2);
    doc.circle(pageW / 2, badgeY + badgeSize / 2, badgeSize / 2 + 14);

    // agregar logo (ajusta tamaño)
    doc.addImage(logo, "PNG", badgeX, badgeY, badgeSize, badgeSize);
  }

  // Título grande
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ink);
  doc.setFontSize(34);
  doc.text("Certificado de Autenticidad", pageW / 2, M + 160, { align: "center" });

  // Línea dorada decorativa
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.2);
  doc.line(pageW / 2 - 150, M + 170, pageW / 2 + 150, M + 170);

  // Párrafo principal -> forzarlo a dos líneas y centrar
  const paragraph =
    `El presente documento certifica que la obra(s) adquirida(s) ` +
    `corresponde(n) a una pieza original de ${siteName}.`;

  // Forzar dos líneas balanceadas por palabra (para mantener sentido)
  const words = paragraph.split(/\s+/).filter(Boolean);
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mute);
  doc.setFontSize(13);
  const paraY = M + 200;
  doc.text(line1, pageW / 2, paraY, { align: "center" });
  doc.text(line2, pageW / 2, paraY + 18, { align: "center" });

  // Datos centrales (caja)
  const orderId = order.pedido_id || (order.session_id ? order.session_id.slice(-10).toUpperCase() : "—");
  const orderDate =
    order.order_date ||
    new Date().toLocaleString("es-MX", { dateStyle: "long" });

  const boxW = 560;
  const boxH = 150;
  const boxX = pageW / 2 - boxW / 2;
  const boxY = M + 260;

  doc.setDrawColor(...line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxW, boxH, 10, 10, "FD");

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ink);
  doc.setFontSize(12);

  const customer = `${order.customer_name || "—"} <${order.customer_email || "—"}>`;
  const totalStr = `${(order.moneda || "MXN").toUpperCase() === "MXN" ? "$" : ""}${money(order.total_mxn || 0)}`;

  let y = boxY + 26;
  doc.text(`Pedido: ${orderId}`, boxX + 18, y);
  doc.text(`Fecha: ${orderDate}`, boxX + boxW - 18, y, { align: "right" });

  y += 20;
  doc.setTextColor(...mute); doc.text("Cliente", boxX + 18, y);
  doc.setTextColor(...ink);  doc.text(customer, boxX + 120, y);

  y += 20;
  doc.setTextColor(...mute); doc.text("Total", boxX + 18, y);
  doc.setTextColor(...ink);  doc.text(totalStr, boxX + 120, y);

  // Obra destacada (si aplica)
  const firstItemTitle = Array.isArray(order.line_items) && order.line_items[0]?.title
    ? String(order.line_items[0].title)
    : null;
  if (firstItemTitle) {
    y += 20;
    doc.setTextColor(...mute); doc.text("Obra destacada", boxX + 18, y);
    doc.setTextColor(...ink);  doc.text(firstItemTitle, boxX + 120, y);
  }

  // Banda dorada inferior pegada al marco interior (muy abajo)
  const bandH = 64;
  // colocamos la banda de forma que su borde superior quede a 12pt del borde interior inferior del marco
  const bandY = pageH - M - bandH - 12;
  const bandX = M + 20;
  const bandW = pageW - 2 * (M + 20);

  doc.setFillColor(...goldSoft);
  doc.roundedRect(bandX, bandY, bandW, bandH, 12, 12, "F");
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.roundedRect(bandX, bandY, bandW, bandH, 12, 12);

  // Texto del sello dentro de la banda (alineado a la izquierda, con margen)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ink);
  const bandPaddingX = 26;
  doc.text("Sello digital de autenticidad", bandX + bandPaddingX, bandY + 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(`${siteName} · ${siteUrl}`, bandX + bandPaddingX, bandY + 42);

  // Firma: trazamos la línea centrada horizontalmente, ubicada justo arriba de la banda
  const signWidth = 300; // líneas más largas se ven mejor centradas
  const signX = pageW / 2 - signWidth / 2;
  const signY = bandY - 36; // espacio entre la línea y la banda

  doc.setDrawColor(...ink);
  doc.setLineWidth(0.6);
  doc.line(signX, signY, signX + signWidth, signY);

  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text("Firma de la artista / taller", pageW / 2, signY + 14, { align: "center" });

  // Output as data URI
  const base64 = doc.output("datauristring");
  return {
    filename: `Certificado_${orderId}.pdf`,
    base64,
  };
}
