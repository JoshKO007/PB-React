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

export async function buildCertificatePDF(order, opts = {}) {
  const {
    siteName = "Arte Restauración Visuales",
    siteUrl = "",
    logoUrl = "",
  } = opts;

  // ✅ Horizontal
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true }); // 842 x 595
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Paleta (dorado + azul/gris)
  const gold = [168, 134, 64];
  const goldSoft = [222, 200, 160];
  const ink = [43, 45, 66];
  const mute = [120, 120, 120];
  const line = [210, 210, 210];

  const M = 48;

  // Marco decorativo (doble borde)
  doc.setDrawColor(...gold);
  doc.setLineWidth(2.2);
  doc.roundedRect(M, M, pageW - 2 * M, pageH - 2 * M, 16, 16);

  doc.setDrawColor(...goldSoft);
  doc.setLineWidth(0.8);
  doc.roundedRect(M + 10, M + 10, pageW - 2 * (M + 10), pageH - 2 * (M + 10), 12, 12);

  // Sombra superior e inferior (líneas suaves)
  doc.setDrawColor(...line);
  doc.setLineWidth(0.6);
  doc.line(M + 26, M + 64, pageW - M - 26, M + 64);
  doc.line(M + 26, pageH - M - 64, pageW - M - 26, pageH - M - 64);

  // Logo como escudo/medallón al centro arriba
  const logo = await fetchImageAsDataURL(logoUrl);
  if (logo) {
    const badgeSize = 96;
    const badgeX = pageW / 2 - badgeSize / 2;
    const badgeY = M + 22;

    // círculo suave “medalla”
    doc.setFillColor(255, 255, 255);
    doc.circle(pageW / 2, badgeY + badgeSize / 2, badgeSize / 2 + 14, "F");
    doc.setDrawColor(...goldSoft);
    doc.setLineWidth(1.2);
    doc.circle(pageW / 2, badgeY + badgeSize / 2, badgeSize / 2 + 14);

    doc.addImage(logo, "PNG", badgeX, badgeY, badgeSize, badgeSize);
  }

  // Título grande
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ink);
  doc.setFontSize(34);
  doc.text("Certificado de Autenticidad", pageW / 2, M + 160, { align: "center" });

  // Líneas finas debajo del título
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.2);
  doc.line(pageW / 2 - 150, M + 170, pageW / 2 + 150, M + 170);

  const orderId = order.pedido_id || (order.session_id ? order.session_id.slice(-10).toUpperCase() : "—");
  const orderDate =
    order.order_date ||
    new Date().toLocaleString("es-MX", { dateStyle: "long" });

  // Texto principal centrado
  const centerY = M + 240;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mute);
  doc.setFontSize(13);
  doc.text(
    `El presente documento certifica que la obra(s) adquirida(s) corresponde(n) a una pieza original de ${siteName}.`,
    pageW / 2,
    centerY,
    { align: "center" }
  );

  doc.setTextColor(...ink);
  doc.setFontSize(16);
  doc.text("Datos de la compra", pageW / 2, centerY + 40, { align: "center" });

  // Caja de datos al centro
  const boxW = 560;
  const boxH = 150;
  const boxX = pageW / 2 - boxW / 2;
  const boxY = centerY + 56;

  doc.setDrawColor(...line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, boxW, boxH, 10, 10, "FD");

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ink);
  doc.setFontSize(12);

  const customer = `${order.customer_name || "—"} <${order.customer_email || "—"}>`;
  const total = `${(order.moneda || "MXN").toUpperCase() === "MXN" ? "$" : ""}${money(order.total_mxn || 0)}`;

  let y = boxY + 26;
  doc.text(`Pedido: ${orderId}`, boxX + 18, y);
  doc.text(`Fecha: ${orderDate}`, boxX + boxW - 18, y, { align: "right" });

  y += 20;
  doc.setTextColor(...mute); doc.text("Cliente", boxX + 18, y);
  doc.setTextColor(...ink);  doc.text(customer, boxX + 120, y);

  y += 20;
  doc.setTextColor(...mute); doc.text("Total", boxX + 18, y);
  doc.setTextColor(...ink);  doc.text(total, boxX + 120, y);

  // Si quieres listar un título principal de la obra (primero de items)
  const firstItemTitle = Array.isArray(order.line_items) && order.line_items[0]?.title
    ? String(order.line_items[0].title)
    : null;
  if (firstItemTitle) {
    y += 20;
    doc.setTextColor(...mute); doc.text("Obra destacada", boxX + 18, y);
    doc.setTextColor(...ink);  doc.text(firstItemTitle, boxX + 120, y);
  }

  // Banda dorada inferior con “sello”
  const bandH = 56;
  const bandY = pageH - M - bandH - 20;
  doc.setFillColor(...goldSoft);
  doc.roundedRect(M + 20, bandY, pageW - 2 * (M + 20), bandH, 12, 12, "F");
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.roundedRect(M + 20, bandY, pageW - 2 * (M + 20), bandH, 12, 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ink);
  doc.text("Sello digital de autenticidad", M + 36, bandY + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(`${siteName} · ${siteUrl}`, M + 36, bandY + 40);

  // Firma / espacio para rubricar (opcional)
  const signX = pageW - (M + 36 + 220);
  const signY = bandY + 16;
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.6);
  doc.line(signX, signY + 28, signX + 220, signY + 28);
  doc.setFontSize(10);
  doc.text("Firma de la artista / taller", signX + 110, signY + 42, { align: "center" });

  const base64 = doc.output("datauristring");
  return {
    filename: `Certificado_${orderId}.pdf`,
    base64,
  };
}
