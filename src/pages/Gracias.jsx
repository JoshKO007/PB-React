// src/pages/Gracias.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import {
  CheckCircle2,
  Receipt,
  ExternalLink,
  Truck,
  Mail,
  ArrowRight,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import { buildInvoicePDF } from "../lib/pdf/invoice";
import { buildCertificatePDF } from "../lib/pdf/certificate";
import { buildEmailJsAttachments } from "../lib/email/attachments";

/* =========================
   Configuración y constantes
   ========================= */

// Endpoint que finaliza el pedido y devuelve los datos ya calculados
const FN_URL =
  import.meta.env.VITE_FINALIZE_ORDER_URL ||
  "https://ousgktyljynqzrnafoqd.supabase.co/functions/v1/finalize-order";

// EmailJS (para pruebas puedes dejar hardcode, en prod usa VITE_*)
const EMAILJS_PUBLIC_KEY      = "XfzYWVNrvPQL2coPj";
const EMAILJS_SERVICE_ID      = "service_pfqtahh";
const EMAILJS_TEMPLATE_CLIENT = "template_k7bkplm";
const EMAILJS_TEMPLATE_OWNER  = "template_44872gn";

// Branding / Sitio
const SITE_NAME     = import.meta.env.VITE_SITE_NAME     || "Arte Restauración Visuales";
const SITE_URL      = import.meta.env.VITE_SITE_URL      || (typeof window !== "undefined" ? window.location.origin : "");
const SITE_LOGO_URL = import.meta.env.VITE_SITE_LOGO_URL || "https://pb-react-phi.vercel.app/logo.png";
const OWNER_EMAIL   = import.meta.env.VITE_OWNER_EMAIL   || import.meta.env.VITE_FROM_EMAIL || "contacto@tu-dominio.com";

/* ===========
   Utilidades
   =========== */

const toMoneyNoSymbol = (n) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

const currencySymbol = (code) =>
  String(code || "MXN").toUpperCase() === "MXN" ? "$" : "";

const shippingLabel = (v) =>
  v === "express" ? "Envío express" :
  v === "retiro"  ? "Retiro en taller" :
                    "Envío estándar";

const safeNumber = (v, def = 0) =>
  (Number.isFinite(Number(v)) ? Number(v) : def);

/** Limpia el carrito en distintos keys comunes de la app */
function clearCart() {
  try {
    const keys = [
      "carrito", "cart", "carritoItems", "cartItems",
      "shopping_cart", "pb_cart", "tienda:carrito",
      "checkout_items", "checkout:cart"
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    // Señal simple para que otros componentes reaccionen
    localStorage.setItem("cart:clearedAt", String(Date.now()));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

/** Asegura limpiar una sola vez por session_id */
function ensureCartClearedOnce(sessionId) {
  const flagKey = `cartCleared:${sessionId}`;
  if (!localStorage.getItem(flagKey)) {
    clearCart();
    localStorage.setItem(flagKey, "1");
  }
}

/* =========================
   Componente principal
   ========================= */

export default function Gracias() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  // Dirección fallback desde la app (por si el backend no manda cada campo)
  const shippingAddressHTML = useMemo(() => {
    try {
      const ses = JSON.parse(localStorage.getItem("sesionActiva") || "null");
      const dir = ses?.id
        ? JSON.parse(localStorage.getItem(`direccionSeleccionada:${ses.id}`) || "null")
        : null;

      if (!dir) return "—";

      const lines = [
        dir.nombre,
        dir.calle,
        [dir.ciudad, dir.estado].filter(Boolean).join(", "),
        `${dir.pais || ""} · CP ${dir.cp || ""}`.trim(),
        dir.referencia ? `<em>${dir.referencia}</em>` : "",
      ].filter(Boolean);

      return lines.join("<br/>");
    } catch {
      return "—";
    }
  }, []);

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState({ loading: false, error: "Falta session_id", data: null });
      return;
    }

    // Evitar re-envíos si recargan
    const idemKey = `finalized:${sessionId}`;
    const cached = localStorage.getItem(idemKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Limpia el carrito aunque venga de caché
      ensureCartClearedOnce(sessionId);
      setState({ loading: false, error: "", data });
      return;
    }

    (async () => {
      try {
        // 1) Finaliza pedido (guarda en BD, calcula totales, etc.) y trae todos los datos listos
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Error al finalizar pedido");

        const d = json.data || {};
        const moneda = (d.moneda || "MXN").toUpperCase();
        const C$ = currencySymbol(moneda);

        // 2) Variables base
        const orderId   = d.pedido_id || sessionId.slice(-10).toUpperCase();
        const orderDate = new Date().toLocaleString("es-MX");

        // Totales / costos
        const subMXN = safeNumber(d.subtotal_mxn);
        const envMXN = safeNumber(d.envio_mxn);
        const feeMXN = safeNumber(d.fee_mxn);
        const taxPct = safeNumber(d.tax_pct || 0);
        const totMXN = safeNumber(d.total_mxn);

        const taxLabel  = taxPct > 0 ? `Impuestos (${taxPct}%)` : "";
        const taxAmount = taxPct > 0 ? (subMXN + envMXN + feeMXN) * (taxPct / 100) : 0;

        // Items -> HTML rows (lo que espera la plantilla)
        const items = Array.isArray(d.line_items) ? d.line_items : [];
        const items_rows = items.map((it) => {
          const qty  = safeNumber(it.quantity, 1);
          const unit = safeNumber(it.unit_amount_mxn);
          const imp  = unit * qty;
          return `<tr>
            <td style="padding:8px 0;border-top:1px solid #eee">${it.title || "Artículo"}</td>
            <td align="center" style="padding:8px 0;border-top:1px solid #eee">${qty}</td>
            <td align="right" style="padding:8px 0;border-top:1px solid #eee">${toMoneyNoSymbol(unit)}</td>
            <td align="right" style="padding:8px 0;border-top:1px solid #eee">${toMoneyNoSymbol(imp)}</td>
          </tr>`;
        }).join("");

        // Dirección (intenta mapear desde distintos orígenes)
        const ship = d.shipping || d.shipping_address || d.direccion || {};
        const shipping_name        = ship.name || ship.nombre || d.customer_name || "";
        const shipping_line1       = ship.line1 || ship.calle || "";
        const shipping_line2       = ship.line2 || ship.referencia || "";
        const shipping_line2_block = shipping_line2 ? `<br/>${shipping_line2}` : "";
        const shipping_city        = ship.city || ship.ciudad || "";
        const shipping_state       = ship.state || ship.estado || "";
        const shipping_postal_code = ship.postal_code || ship.cp || ship.codigo_postal || "";
        const shipping_country     = ship.country || ship.pais || "MX";

        const shipping_method_label = shippingLabel(d.shipping_metodo);
        const payment_method_label  = d.payment_method_label || "Tarjeta";

        const receipt_url     = d.receipt_url || "";
        const admin_order_url = d.admin_order_url || `${SITE_URL}/admin/pedidos/${orderId}`;
        const order_url       = d.order_url || `${SITE_URL}/pedidos/${orderId}`;

        // 2.5) Generar PDFs (Factura y Certificado) para adjuntar en los correos
        const pdfInvoice = await buildInvoicePDF(d, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          logoUrl: SITE_LOGO_URL,
          currencySymbol: C$,
        });
        const pdfCert = await buildCertificatePDF(d, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          logoUrl: SITE_LOGO_URL,
        });
        const attachments = buildEmailJsAttachments([pdfInvoice, pdfCert]);

        // 3) Inicializa EmailJS (nota: los adjuntos van como dataURI base64 en el payload)
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

        // 4) Email al CLIENTE
        if (d.customer_email && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_CLIENT) {
          const varsCliente = {
            email: d.customer_email,           // destino
            site_name: SITE_NAME,
            site_url: SITE_URL,
            year: String(new Date().getFullYear()),
            order_id: orderId,
            order_date: orderDate,
            customer_name: d.customer_name || "",
            customer_email: d.customer_email || "",
            currency_symbol: C$,
            subtotal:       toMoneyNoSymbol(subMXN),
            shipping_cost:  toMoneyNoSymbol(envMXN),
            processing_fee: toMoneyNoSymbol(feeMXN),
            tax_label:      taxLabel,
            tax_amount:     taxPct > 0 ? toMoneyNoSymbol(taxAmount) : "",
            total:          toMoneyNoSymbol(totMXN),
            items_rows,
            shipping_method_label,
            shipping_name,
            shipping_line1,
            shipping_line2,
            shipping_line2_block,   // para la plantilla
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country,
            order_url,
            receipt_url,
            support_email: OWNER_EMAIL || "contacto@tu-dominio.com",
          };

          try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, {
              ...varsCliente,
              attachments,
            });
          } catch (e) {
            console.warn("EmailJS (cliente) falló:", e);
          }
        }

        // 5) Email al DUEÑO
        const ownerEmail = d.owner_email || OWNER_EMAIL;
        if (ownerEmail && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_OWNER) {
          const varsDueno = {
            email: ownerEmail,
            site_name: SITE_NAME,
            site_url: SITE_URL,
            year: String(new Date().getFullYear()),
            order_id: orderId,
            order_date: orderDate,
            customer_name: d.customer_name || "",
            customer_email: d.customer_email || "",
            customer_phone: d.customer_phone || "",
            payment_method_label,
            shipping_method_label,
            currency_symbol: C$,
            subtotal:       toMoneyNoSymbol(subMXN),
            shipping_cost:  toMoneyNoSymbol(envMXN),
            processing_fee: toMoneyNoSymbol(feeMXN),
            tax_label:      taxLabel,
            tax_amount:     taxPct > 0 ? toMoneyNoSymbol(taxAmount) : "",
            total:          toMoneyNoSymbol(totMXN),
            items_rows,
            shipping_name,
            shipping_line1,
            shipping_line2,
            shipping_line2_block,   // para la plantilla
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country,
            admin_order_url,
            receipt_url,
            internal_notes: d.internal_notes || "",
          };

          try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_OWNER, {
              ...varsDueno,
              attachments,
            });
          } catch (e) {
            console.warn("EmailJS (dueño) falló:", e);
          }
        }

        // 6) Limpia carrito y cachea datos
        ensureCartClearedOnce(sessionId);
        localStorage.setItem(idemKey, JSON.stringify(d));

        setState({ loading: false, error: "", data: d });
      } catch (err) {
        console.error("Gracias.jsx error:", err);
        setState({ loading: false, error: String(err?.message || err), data: null });
      }
    })();
  }, [params]);

  /* =========================
     UI Helpers para el render
     ========================= */

  const Chip = ({ children }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );

  const Row = ({ label, value, strong }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${strong ? "font-semibold text-gray-900" : "text-gray-800"}`}>
        {value}
      </span>
    </div>
  );

  /* =========================
     Estados de carga / error
     ========================= */

  if (state.loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4">
        <div className="w-full max-w-3xl">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-gray-700" size={24} />
            <p className="text-gray-700">Procesando tu pedido y enviando confirmación…</p>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="h-24 rounded-2xl bg-white shadow-sm border animate-pulse" />
            <div className="h-40 rounded-2xl bg-white shadow-sm border animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 h-12 w-12 grid place-items-center rounded-full bg-rose-100 text-rose-600">
            !
          </div>
          <h1 className="text-xl font-semibold">Ups…</h1>
          <p className="mt-2 text-gray-600 text-sm">{state.error}</p>
          <button
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md"
            onClick={() => navigate("/tienda")}
          >
            Volver a la tienda <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* =========================
     Render principal
     ========================= */

  const d = state.data || {};
  const C$ = currencySymbol(d.moneda || "MXN");

  const items = Array.isArray(d.line_items) ? d.line_items : [];
  const subtotal = toMoneyNoSymbol(d.subtotal_mxn || 0);
  const shippingCost = toMoneyNoSymbol(d.envio_mxn || 0);
  const fee = toMoneyNoSymbol(d.fee_mxn || 0);
  const taxPct = safeNumber(d.tax_pct || 0);
  const taxAmount =
    taxPct > 0
      ? toMoneyNoSymbol(
          (safeNumber(d.subtotal_mxn) + safeNumber(d.envio_mxn) + safeNumber(d.fee_mxn)) *
            (taxPct / 100)
        )
      : "";
  const total = toMoneyNoSymbol(d.total_mxn || 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Encabezado de confirmación */}
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">¡Gracias por tu compra!</h1>
              <p className="mt-1 text-sm text-gray-600">
                Te enviamos un correo a{" "}
                <a className="underline decoration-gray-300 hover:decoration-gray-700" href={`mailto:${d.customer_email}`}>
                  {d.customer_email || "—"}
                </a>{" "}
                con el resumen.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip>Pedido: <span className="font-semibold">{d.pedido_id || "N/A"}</span></Chip>
                <Chip className="whitespace-nowrap">Total: <span className="font-semibold">{C$}{total}</span></Chip>
                <Chip><Truck size={14} /> {shippingLabel(d.shipping_metodo)}</Chip>
              </div>
            </div>
          </div>

          {/* Botones PRINCIPALES arriba para mayor visibilidad */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/tienda")}
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md"
              title="Seguir comprando"
            >
              <ShoppingBag size={16} /> Seguir comprando
            </button>

            {d.order_url && (
              <a
                href={d.order_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Ver pedido <ExternalLink size={16} />
              </a>
            )}
            {d.receipt_url && (
              <a
                href={d.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Ver recibo <Receipt size={16} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Grid con resumen e items */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Artículos</h2>

          {items.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No se encontraron artículos del pedido.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-3">Artículo</th>
                    <th className="py-2 pr-3 text-center">Cant.</th>
                    <th className="py-2 pr-3 text-right">Precio</th>
                    <th className="py-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((it, idx) => {
                    const qty = safeNumber(it.quantity || 1);
                    const unit = safeNumber(it.unit_amount_mxn || 0);
                    const imp = unit * qty;
                    return (
                      <tr key={idx}>
                        <td className="py-2 pr-3">{it.title || "Artículo"}</td>
                        <td className="py-2 pr-3 text-center">{qty}</td>
                        <td className="py-2 pr-3 text-right">{C$}{toMoneyNoSymbol(unit)}</td>
                        <td className="py-2 text-right">{C$}{toMoneyNoSymbol(imp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen / Dirección */}
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Resumen</h3>
            <div className="mt-3 space-y-1.5">
              <Row label="Subtotal" value={`${C$}${subtotal}`} />
              <Row label={`Envío (${shippingLabel(d.shipping_metodo)})`} value={`${C$}${shippingCost}`} />
              <Row label="Cargo por procesamiento" value={`${C$}${fee}`} />
              {taxPct > 0 && <Row label={`Impuestos (${taxPct}%)`} value={`${C$}${taxAmount}`} />}
              <div className="mt-2 border-t pt-2">
                <Row label="Total" value={`${C$}${total}`} strong />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Envío</h3>
            <div className="mt-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <Truck size={16} className="mt-0.5 text-gray-500" />
                <div>
                  <div className="font-medium">{shippingLabel(d.shipping_metodo)}</div>
                  <div className="mt-2 leading-relaxed">
                    {/* Si backend no manda cada campo, mostramos el HTML de fallback */}
                    {d.shipping?.name || d.shipping_name ? (
                      <>
                        {(d.shipping_name || d.shipping?.name) || "—"} <br />
                        {(d.shipping_line1 || d.shipping?.line1) || "—"}{" "}
                        {(d.shipping_line2 || d.shipping?.line2) ? <><br />{d.shipping_line2 || d.shipping?.line2}</> : ""}
                        <br />
                        {(d.shipping_city || d.shipping?.city) || "—"},{" "}
                        {(d.shipping_state || d.shipping?.state) || "—"}{" "}
                        {(d.shipping_postal_code || d.shipping?.postal_code) || "—"} <br />
                        {(d.shipping_country || d.shipping?.country) || "—"}
                      </>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: shippingAddressHTML }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Soporte</h3>
            <p className="mt-2 text-sm text-gray-700">
              Si necesitas ayuda con tu pedido, escríbenos a{" "}
              <a className="inline-flex items-center gap-1 underline decoration-gray-300 hover:decoration-gray-700"
                 href={`mailto:${OWNER_EMAIL}`}>
                <Mail size={14} /> {OWNER_EMAIL}
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
