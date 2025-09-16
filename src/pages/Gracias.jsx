// src/pages/Gracias.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";

// === Endpoint que finaliza el pedido y devuelve los datos ya calculados ===
const FN_URL =
  import.meta.env.VITE_FINALIZE_ORDER_URL ||
  "https://ousgktyljynqzrnafoqd.supabase.co/functions/v1/finalize-order";

// === EmailJS (puedes dejar estos hardcodeados en pruebas) ===
const EMAILJS_PUBLIC_KEY      = "XfzYWVNrvPQL2coPj";
const EMAILJS_SERVICE_ID      = "service_pfqtahh";
const EMAILJS_TEMPLATE_CLIENT = "template_k7bkplm";
const EMAILJS_TEMPLATE_OWNER  = "template_44872gn";

// === Branding / Sitio ===
const SITE_NAME     = import.meta.env.VITE_SITE_NAME     || "Arte Restauración Visuales";
const SITE_URL      = import.meta.env.VITE_SITE_URL      || (typeof window !== "undefined" ? window.location.origin : "");
const SITE_LOGO_URL = import.meta.env.VITE_SITE_LOGO_URL || "https://pb-react-phi.vercel.app/logo.png";
const OWNER_EMAIL   = import.meta.env.VITE_OWNER_EMAIL   || import.meta.env.VITE_FROM_EMAIL || "contacto@tu-dominio.com";

// === Helpers de formateo ===
const toMoneyNoSymbol = (n) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
const currencySymbol = (code) => (String(code || "MXN").toUpperCase() === "MXN" ? "$" : ""); // puedes ajustar a MX$
const shippingLabel = (v) =>
  v === "express" ? "Envío express" : v === "retiro" ? "Retiro en taller" : "Envío estándar";
const safeNumber = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

export default function Gracias() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  // Dirección fallback desde tu app (si el backend no manda cada campo)
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

    // Evita re-envíos si recargan
    const idemKey = `finalized:${sessionId}`;
    const cached = localStorage.getItem(idemKey);
    if (cached) {
      const data = JSON.parse(cached);
      setState({ loading: false, error: "", data });
      return;
    }

    (async () => {
      try {
        // 1) Finaliza pedido (guarda BD, etc.) y trae los datos listos
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

        // 2) Variables “básicas” compartidas
        const orderId   = d.pedido_id || sessionId.slice(-10).toUpperCase();
        const orderDate = new Date().toLocaleString("es-MX");

        // Totales y costos
        const subMXN = safeNumber(d.subtotal_mxn);
        const envMXN = safeNumber(d.envio_mxn);
        const feeMXN = safeNumber(d.fee_mxn);
        const taxPct = safeNumber(d.tax_pct || 0);
        const totMXN = safeNumber(d.total_mxn);

        const taxLabel  = taxPct > 0 ? `Impuestos (${taxPct}%)` : "";
        const taxAmount = taxPct > 0 ? (subMXN + envMXN + feeMXN) * (taxPct / 100) : 0;

        // Items -> HTML rows (tu template espera {{items_rows}})
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

        // Dirección de envío (el template del cliente espera cada campo)
        // Intentamos mapear desde distintos posibles orígenes:
        const ship =
          d.shipping ||
          d.shipping_address ||
          d.direccion ||
          {};

        const shipping_name        = ship.name || ship.nombre || d.customer_name || "";
        const shipping_line1       = ship.line1 || ship.calle || "";
        const shipping_line2       = ship.line2 || ship.referencia || "";
        const shipping_city        = ship.city || ship.ciudad || "";
        const shipping_state       = ship.state || ship.estado || "";
        const shipping_postal_code = ship.postal_code || ship.cp || ship.codigo_postal || "";
        const shipping_country     = ship.country || ship.pais || "MX";

        const shipping_method_label = shippingLabel(d.shipping_metodo);
        const payment_method_label  = d.payment_method_label || "Tarjeta"; // si tu backend no lo manda

        const receipt_url     = d.receipt_url || "";
        const admin_order_url = d.admin_order_url || `${SITE_URL}/admin/pedidos/${orderId}`;
        const order_url       = d.order_url || `${SITE_URL}/pedidos/${orderId}`;

        // 3) Inicializa EmailJS (SDK oficial)
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

        // 4) CLIENTE — tu template usa {{email}} como "To email"
        if (d.customer_email && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_CLIENT) {
          const varsCliente = {
            // Routing (tu template usa {{email}} en "To email")
            email: d.customer_email,

            // Header / branding
            site_name: SITE_NAME,
            site_url: SITE_URL,
            year: String(new Date().getFullYear()),

            // Pedido
            order_id: orderId,
            order_date: orderDate,

            // Cliente
            customer_name: d.customer_name || "",
            customer_email: d.customer_email || "",

            // Resumen (sin símbolo, el HTML antepone {{currency_symbol}})
            currency_symbol: C$,
            subtotal:       toMoneyNoSymbol(subMXN),
            shipping_cost:  toMoneyNoSymbol(envMXN),
            processing_fee: toMoneyNoSymbol(feeMXN),
            tax_label:      taxLabel,
            tax_amount:     taxPct > 0 ? toMoneyNoSymbol(taxAmount) : "",
            total:          toMoneyNoSymbol(totMXN),

            // Items y envío
            items_rows,
            shipping_method_label,
            shipping_name,
            shipping_line1,
            shipping_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country,

            // Links / Soporte
            order_url,
            receipt_url,
            support_email: OWNER_EMAIL || "contacto@tu-dominio.com",
          };

          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, varsCliente);
        }

        // 5) DUEÑO — tu template usa {{email}} como "To email"
        const ownerEmail = d.owner_email || OWNER_EMAIL;
        if (ownerEmail && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_OWNER) {
          const varsDueno = {
            // Routing
            email: ownerEmail,

            // Branding
            site_name: SITE_NAME,
            site_url: SITE_URL,
            year: String(new Date().getFullYear()),

            // Pedido
            order_id: orderId,
            order_date: orderDate,

            // Cliente
            customer_name: d.customer_name || "",
            customer_email: d.customer_email || "",
            customer_phone: d.customer_phone || "",

            // Pago / Envío
            payment_method_label,
            shipping_method_label,

            // Resumen (sin símbolo)
            currency_symbol: C$,
            subtotal:       toMoneyNoSymbol(subMXN),
            shipping_cost:  toMoneyNoSymbol(envMXN),
            processing_fee: toMoneyNoSymbol(feeMXN),
            tax_label:      taxLabel,
            tax_amount:     taxPct > 0 ? toMoneyNoSymbol(taxAmount) : "",
            total:          toMoneyNoSymbol(totMXN),

            // Items y envío
            items_rows,
            shipping_name,
            shipping_line1,
            shipping_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country,

            // Admin / recibo / notas internas
            admin_order_url,
            receipt_url,
            internal_notes: d.internal_notes || "",
          };

          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_OWNER, varsDueno);
        }

        // 6) Cachea para idempotencia y muestra confirmación
        localStorage.setItem(idemKey, JSON.stringify(d));
        setState({ loading: false, error: "", data: d });
      } catch (err) {
        console.error("Gracias.jsx error:", err);
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
        <div className="font-semibold">
          Total pagado: {currencySymbol(d.moneda) + toMoneyNoSymbol(d.total_mxn || 0)}
        </div>
        <div className="text-sm text-gray-600">
          Método de envío: {shippingLabel(d.shipping_metodo)}
        </div>
      </div>

      <button className="mt-6 border px-4 py-2 rounded" onClick={() => navigate("/tienda")}>
        Seguir comprando
      </button>
    </div>
  );
}
