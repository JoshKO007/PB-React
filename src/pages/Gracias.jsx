// src/pages/Gracias.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";

const FN_URL = import.meta.env.VITE_FINALIZE_ORDER_URL
  || "https://ousgktyljynqzrnafoqd.supabase.co/functions/v1/finalize-order";


const EMAILJS_PUBLIC_KEY      = "XfzYWVNrvPQL2coPj";   // p.ej: "u8aBcD123ABC..."
const EMAILJS_SERVICE_ID      = "service_pfqtahh";              // p.ej: "service_1a2b3c"
const EMAILJS_TEMPLATE_CLIENT = "template_k7bkplm";                // el ID exacto de tu template para el cliente
const EMAILJS_TEMPLATE_OWNER  = "template_44872gn";                  // el ID exacto de tu template para el dueño

// Sitio (.env)
const SITE_NAME     = import.meta.env.VITE_SITE_NAME     || "Arte Restauración Visuales";
const SITE_URL      = import.meta.env.VITE_SITE_URL      || window.location.origin;
const SITE_LOGO_URL = import.meta.env.VITE_SITE_LOGO_URL || "/logo.png";
const OWNER_EMAIL   = import.meta.env.VITE_OWNER_EMAIL   || import.meta.env.VITE_FROM_EMAIL || "";

const fmtMoney = (n, c = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: c }).format(Number(n || 0));

const shippingLabel = (v) =>
  v === "express" ? "Envío express" : v === "retiro" ? "Retiro en taller" : "Envío estándar";

const safeNumber = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

export default function Gracias() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  // obtiene dirección guardada por el usuario (fallback para el template)
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

    // evita re-envíos en recarga
    const idemKey = `finalized:${sessionId}`;
    const cached = localStorage.getItem(idemKey);
    if (cached) {
      const data = JSON.parse(cached);
      setState({ loading: false, error: "", data });
      // (ya no re-envía mails)
      return;
    }

    (async () => {
      try {
        // 1) finaliza pedido en tu función (trae totales/line_items/receipt/etc.)
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Error al finalizar pedido");

        const d = json.data || {};
        const moneda = d.moneda || "MXN";

        // 2) variables comunes para ambas plantillas
        const orderId = d.pedido_id || sessionId.slice(-10).toUpperCase();
        const orderDate = new Date().toLocaleString("es-MX");

        const subMXN   = safeNumber(d.subtotal_mxn);
        const envMXN   = safeNumber(d.envio_mxn);
        const feeMXN   = safeNumber(d.fee_mxn);
        const taxPct   = safeNumber(d.tax_pct || 0);
        const totMXN   = safeNumber(d.total_mxn);

        const taxLabel = taxPct > 0 ? `Impuestos (${taxPct}%)` : "";
        const taxAmount = taxPct > 0 ? (subMXN + envMXN + feeMXN) * (taxPct / 100) : 0;

        const items = Array.isArray(d.line_items) ? d.line_items : [];
        const items_rows_html = items
          .map((it) => {
            const qty = safeNumber(it.quantity, 1);
            const unit = safeNumber(it.unit_amount_mxn);
            const imp = unit * qty;
            return `<tr>
              <td style="padding:8px 0;border-top:1px solid #eee">${it.title || "Artículo"}</td>
              <td align="center" style="padding:8px 0;border-top:1px solid #eee">${qty}</td>
              <td align="right" style="padding:8px 0;border-top:1px solid #eee">${fmtMoney(unit, moneda)}</td>
              <td align="right" style="padding:8px 0;border-top:1px solid #eee">${fmtMoney(imp, moneda)}</td>
            </tr>`;
          })
          .join("");

        // 3) inicializa EmailJS
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

        // 4) manda correo al CLIENTE
        if (d.customer_email && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_CLIENT) {
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, {
            // routing
            to_email: d.customer_email,
            to_name: d.customer_name || "Cliente",

            // branding / header
            site_name: SITE_NAME,
            site_url: SITE_URL,
            site_logo_url: SITE_LOGO_URL,

            // order basics
            order_id: orderId,
            order_date: orderDate,

            // customer
            customer_name: d.customer_name || "",
            customer_email: d.customer_email || "",

            // summary (formateado)
            subtotal: fmtMoney(subMXN, moneda),
            shipping_label: shippingLabel(d.shipping_metodo),
            shipping_cost: fmtMoney(envMXN, moneda),
            processing_fee: fmtMoney(feeMXN, moneda),
            tax_label: taxLabel,
            tax_amount: taxPct > 0 ? fmtMoney(taxAmount, moneda) : "",
            total: fmtMoney(totMXN, moneda),
            currency_symbol: moneda === "MXN" ? "$" : "",

            // tabla e info extra
            items_rows_html,
            shipping_address_html: d.shipping_address_html || shippingAddressHTML,
            receipt_url: d.receipt_url || "",
          });
        }

        // 5) manda correo al DUEÑO
        const ownerEmail = d.owner_email || OWNER_EMAIL;
        if (ownerEmail && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_OWNER) {
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_OWNER, {
            to_email: ownerEmail,

            site_name: SITE_NAME,
            site_url: SITE_URL,
            site_logo_url: SITE_LOGO_URL,

            order_id: orderId,
            order_date: orderDate,

            customer_name: d.customer_name || "",
            customer_email: d.customer_email || "",
            customer_phone: d.customer_phone || "",

            subtotal: fmtMoney(subMXN, moneda),
            shipping_label: shippingLabel(d.shipping_metodo),
            shipping_cost: fmtMoney(envMXN, moneda),
            processing_fee: fmtMoney(feeMXN, moneda),
            tax_label: taxLabel,
            tax_amount: taxPct > 0 ? fmtMoney(taxAmount, moneda) : "",
            total: fmtMoney(totMXN, moneda),
            currency_symbol: moneda === "MXN" ? "$" : "",

            items_rows_html,
            shipping_address_html: d.shipping_address_html || shippingAddressHTML,
            receipt_url: d.receipt_url || "",

            // si tienes panel admin, arma la URL aquí:
            admin_order_url: d.admin_order_url || `${SITE_URL}/admin/pedidos/${orderId}`,
          });
        }

        // 6) cachea resultado e imprime pantalla
        localStorage.setItem(idemKey, JSON.stringify(d));
        setState({ loading: false, error: "", data: d });
      } catch (err) {
        setState({ loading: false, error: String(err?.message || err), data: null });
      }
    })();
  }, [params]);

  if (state.loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div>Cargando y enviando tu confirmación…</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold">Ups</h1>
          <p className="text-sm mt-2">{state.error}</p>
          <button className="mt-4 border px-4 py-2 rounded" onClick={() => navigate("/tienda")}>
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  const d = state.data || {};
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">¡Gracias por tu compra!</h1>
      <p className="text-sm mt-2">
        Pedido <strong>{d.pedido_id || "N/A"}</strong>. Te enviamos un correo con el resumen.
      </p>

      <div className="mt-6 border rounded p-4 bg-white">
        <div className="font-semibold">Total pagado: {fmtMoney(d.total_mxn || 0, d.moneda || "MXN")}</div>
        <div className="text-sm text-gray-600">Método de envío: {shippingLabel(d.shipping_metodo)}</div>
      </div>

      <button className="mt-6 border px-4 py-2 rounded" onClick={() => navigate("/tienda")}>
        Seguir comprando
      </button>
    </div>
  );
}
