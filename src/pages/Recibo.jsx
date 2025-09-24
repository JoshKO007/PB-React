// src/pages/Recibo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Receipt, FileCheck, Download, ExternalLink } from "lucide-react";
import { buildInvoicePDF } from "../lib/pdf/invoice";
import { buildCertificatePDF } from "../lib/pdf/certificate";

// mismo finalize que usas en Gracias.jsx
const FN_URL =
  import.meta.env.VITE_FINALIZE_ORDER_URL ||
  "https://ousgktyljynqzrnafoqd.supabase.co/functions/v1/finalize-order";

const SITE_NAME     = import.meta.env.VITE_SITE_NAME     || "Arte Restauración Visuales";
const SITE_URL      = import.meta.env.VITE_SITE_URL      || (typeof window !== "undefined" ? window.location.origin : "");
const SITE_LOGO_URL = import.meta.env.VITE_SITE_LOGO_URL || "https://pb-react-phi.vercel.app/logo.png";

const currencySymbol = (code) => (String(code || "MXN").toUpperCase() === "MXN" ? "$" : "");
const toMoney = (n) => new Intl.NumberFormat("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0));

export default function Recibo() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const session_id = params.get("session_id") || "";
  const order_id   = params.get("order") || ""; // lo mandaremos también por si lo quieres mostrar

  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
    invoice: null,      // { filename, base64 }
    certificate: null,  // { filename, base64 }
  });

  useEffect(() => {
    if (!session_id) {
      setState(s => ({...s, loading:false, error:"Falta session_id en la URL"}));
      return;
    }

    (async () => {
      try {
        // Traer datos del pedido (idempotente; tu función ya la usas en Gracias.jsx)
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id }), // si tu función soporta read-only, puedes añadir { readonly: true }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar el pedido");

        const d = json.data || {};
        const C$ = currencySymbol(d.moneda || "MXN");

        // Generar PDFs en cliente (sin logo para hacerlos livianos/rápidos)
        const [pdfInvoice, pdfCert] = await Promise.all([
          buildInvoicePDF(d, { siteName: SITE_NAME, siteUrl: SITE_URL, logoUrl: "", currencySymbol: C$ }),
          buildCertificatePDF(d, { siteName: SITE_NAME, siteUrl: SITE_URL, logoUrl: "" }),
        ]);

        setState({
          loading: false,
          error: "",
          data: d,
          invoice: pdfInvoice,      // { filename, base64, blob? }
          certificate: pdfCert,     // { filename, base64, blob? }
        });
      } catch (err) {
        setState(s => ({...s, loading:false, error: String(err?.message || err)}));
      }
    })();
  }, [session_id]);

  const d  = state.data || {};
  const C$ = currencySymbol(d.moneda || "MXN");
  const orderIdShown = d.pedido_id || order_id || (session_id ? session_id.slice(-10).toUpperCase() : "—");

  const downloadDataUri = (dataUri, filename = "archivo.pdf") => {
    const a = document.createElement("a");
    a.href = dataUri; // data:application/pdf;base64,...
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (state.loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-gray-700" size={22} />
          <p className="text-gray-700">Cargando recibo…</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-center">
          <div className="text-rose-600 mb-2">¡Ups!</div>
          <p className="text-gray-700 text-sm">{state.error}</p>
          <button
            onClick={() => navigate("/tienda")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16}/> Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  const items = Array.isArray(d.line_items) ? d.line_items : [];
  const subtotal = toMoney(d.subtotal_mxn || 0);
  const envio    = toMoney(d.envio_mxn || 0);
  const fee      = toMoney(d.fee_mxn || 0);
  const taxPct   = Number(d.tax_pct || 0);
  const taxAmt   = taxPct > 0 ? toMoney(((+d.subtotal_mxn||0)+(+d.envio_mxn||0)+(+d.fee_mxn||0))*(taxPct/100)) : "";
  const total    = toMoney(d.total_mxn || 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Recibo de compra</h1>
            <p className="text-gray-600 text-sm mt-1">
              Pedido: <span className="font-semibold">{orderIdShown}</span>
            </p>
            {d.customer_email && (
              <p className="text-gray-600 text-sm">Cliente: {d.customer_name || "—"} &lt;{d.customer_email}&gt;</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {state.invoice?.base64 && (
              <button
                onClick={() => downloadDataUri(state.invoice.base64, state.invoice.filename)}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                title="Descargar factura PDF"
              >
                <Receipt size={16}/> Descargar factura
              </button>
            )}

            {state.certificate?.base64 && (
              <button
                onClick={() => downloadDataUri(state.certificate.base64, state.certificate.filename)}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                title="Descargar certificado PDF"
              >
                <FileCheck size={16}/> Descargar certificado
              </button>
            )}

            {d.receipt_url && (
              <a
                href={d.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                title="Recibo del procesador de pagos"
              >
                Ver recibo externo <ExternalLink size={16}/>
              </a>
            )}
          </div>
        </div>

        {/* tabla simple */}
        <div className="mt-6 overflow-x-auto">
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
              {items.map((it, i) => {
                const qty  = Number(it.quantity||1);
                const unit = Number(it.unit_amount_mxn||0);
                const imp  = qty * unit;
                return (
                  <tr key={i}>
                    <td className="py-2 pr-3">{it.title || "Artículo"}</td>
                    <td className="py-2 pr-3 text-center">{qty}</td>
                    <td className="py-2 pr-3 text-right">{currencySymbol(d.moneda)}{toMoney(unit)}</td>
                    <td className="py-2 text-right">{currencySymbol(d.moneda)}{toMoney(imp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* totales */}
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div />
          <div className="rounded-2xl border p-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{currencySymbol(d.moneda)}{subtotal}</span></div>
            <div className="flex justify-between text-sm"><span>Envío</span><span>{currencySymbol(d.moneda)}{envio}</span></div>
            <div className="flex justify-between text-sm"><span>Cargo por procesamiento</span><span>{currencySymbol(d.moneda)}{fee}</span></div>
            {taxPct > 0 && (
              <div className="flex justify-between text-sm"><span>Impuestos ({taxPct}%)</span><span>{currencySymbol(d.moneda)}{taxAmt}</span></div>
            )}
            <div className="mt-2 border-t pt-2 flex justify-between font-semibold">
              <span>Total</span><span>{currencySymbol(d.moneda)}{total}</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate("/tienda")}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <ArrowLeft size={16}/> Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  );
}
