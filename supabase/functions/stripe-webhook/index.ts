// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function buildInvoicePDF(params: {
  siteName: string;
  siteLogoUrl?: string;
  pedidoId: string;
  sessionId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  items: { title: string; unit_amount_mxn: number; quantity: number }[];
  envio_mxn: number;
  fee_mxn: number;
  tax_percent?: number | null;
  amount_total_mxn: number;
}) {
  const {
    siteName,
    siteLogoUrl,
    pedidoId,
    sessionId,
    customerName,
    customerEmail,
    items,
    envio_mxn,
    fee_mxn,
    tax_percent,
    amount_total_mxn,
  } = params;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;

  // Logo (opcional)
  if (siteLogoUrl) {
    try {
      const imgResp = await fetch(siteLogoUrl);
      const bytes = new Uint8Array(await imgResp.arrayBuffer());
      let img;
      try {
        img = await pdf.embedPng(bytes);
      } catch {
        img = await pdf.embedJpg(bytes);
      }
      const imgW = 90;
      const imgH = (imgW / img.width) * img.height;
      page.drawImage(img, { x: 40, y: y - imgH, width: imgW, height: imgH });
    } catch {
      // sin logo
    }
  }

  // Encabezado
  page.drawText(siteName || "Tu tienda", {
    x: 40,
    y: y - 15,
    size: 16,
    font: fontBold,
  });

  y -= 40;

  page.drawText(`Factura / Pedido: ${pedidoId}`, { x: 40, y, size: 12, font });
  y -= 16;
  page.drawText(`Stripe Session: ${sessionId}`, { x: 40, y, size: 10, font, color: rgb(0.4,0.4,0.4) });
  y -= 20;

  if (customerName || customerEmail) {
    page.drawText("Cliente:", { x: 40, y, size: 12, fontBold });
    y -= 14;
    if (customerName) { page.drawText(customerName, { x: 40, y, size: 11, font }); y -= 14; }
    if (customerEmail) { page.drawText(customerEmail, { x: 40, y, size: 11, font, color: rgb(0.2,0.2,0.2) }); y -= 16; }
    y -= 6;
  }

  // Tabla simple de items
  page.drawText("Concepto", { x: 40, y, size: 11, fontBold });
  page.drawText("Cant.",   { x: width - 200, y, size: 11, fontBold });
  page.drawText("Precio",  { x: width - 120, y, size: 11, fontBold });
  page.drawText("Importe", { x: width - 60,  y, size: 11, fontBold });
  y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.8,0.8,0.8) });
  y -= 12;

  const dinero = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  for (const it of items) {
    if (y < 120) { y = 760; pdf.addPage(); }
    page.drawText(it.title.slice(0, 48), { x: 40, y, size: 10, font });
    page.drawText(String(it.quantity),   { x: width - 195, y, size: 10, font });
    page.drawText(dinero(it.unit_amount_mxn), { x: width - 130, y, size: 10, font });
    page.drawText(dinero(it.unit_amount_mxn * it.quantity), { x: width - 60, y, size: 10, font });
    y -= 14;
  }

  // Totales
  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.8,0.8,0.8) });
  y -= 14;

  const subtotal = items.reduce((s, it) => s + it.unit_amount_mxn * it.quantity, 0);

  const drawRow = (label: string, value: string, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(label, { x: width - 200, y, size: 11, font: f });
    page.drawText(value, { x: width - 60 - (value.length * 5), y, size: 11, font: f });
    y -= 14;
  };

  drawRow("Subtotal:", dinero(subtotal));
  drawRow("Envío:", dinero(envio_mxn));
  drawRow("Cargo por procesamiento:", dinero(fee_mxn));
  if (tax_percent && tax_percent > 0) drawRow(`Impuestos (${tax_percent}%):`, dinero((subtotal + envio_mxn + fee_mxn) * (tax_percent/100)));
  drawRow("TOTAL:", dinero(amount_total_mxn), true);

  const pdfBytes = await pdf.save();
  return pdfBytes;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY")!;
    const siteName = Deno.env.get("SITE_NAME") || "Tu tienda";
    const siteLogo = Deno.env.get("SITE_LOGO_URL") || "";
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "";

    if (!whSecret || !stripeKey || !resendKey || !serviceRole) {
      return new Response(JSON.stringify({ error: "Faltan secrets" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Leer RAW body para verificar firma
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature") || "";

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(raw, sig, whSecret);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Nos interesan ambos por si acaso
    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      // Si vino payment_intent.succeeded, intenta sacar session id de metadata / latest_charge
      let sessionId = "";
      if (event.type === "checkout.session.completed") {
        sessionId = (event.data.object as Stripe.Checkout.Session).id;
      }

      // Si no tenemos sessionId aún, podemos ignorar este tipo o resolverlo de otra forma.
      if (!sessionId && event.type === "payment_intent.succeeded") {
        // opcional: resolver por client_reference_id/metadata si lo mandaste
        // Para mantenerlo simple, salimos si no hay sessionId.
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Recuperamos la sesión completa con expand
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent", "payment_intent.charges.data"],
      });

      const lineItems = (session.line_items?.data || []).map((li) => ({
        title: li.description || li.price?.product?.toString() || "Artículo",
        unit_amount_mxn: (li.price?.unit_amount || 0) / 100,
        quantity: li.quantity || 1,
      }));

      const pi = session.payment_intent as Stripe.PaymentIntent | null;
      const charge = pi?.charges?.data?.[0];
      const receipt_url = charge?.receipt_url || "";

      // Metadata que mandamos desde create-checkout
      const shipping_method = (pi?.metadata?.shipping || session.metadata?.shipping || "") as string;
      const envio_mxn = Number(pi?.metadata?.envio_mxn || session.metadata?.envio_mxn || 0);
      const fee_mxn = Number(pi?.metadata?.fee_mxn || session.metadata?.fee_mxn || 0);
      const tax_percent = session.metadata?.tax_percent ? Number(session.metadata.tax_percent) :
                          pi?.metadata?.tax_percent ? Number(pi.metadata.tax_percent) : null;

      const amount_total_mxn = (session.amount_total || 0) / 100;
      const currency = session.currency?.toUpperCase() || "MXN";
      const customerEmail = session.customer_details?.email || session.customer_email || "";
      const customerName = session.customer_details?.name || "";

      // Insertar en BD
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabase = createClient(supabaseUrl, serviceRole);
      const { data: pedidoInsert, error: pedidoErr } = await supabase
        .from("pedidos")
        .insert({
          stripe_session_id: session.id,
          stripe_payment_intent: pi?.id || null,
          user_id: session.metadata?.usuario_id || null,
          email: customerEmail,
          nombre: customerName,
          amount_total_mxn,
          currency,
          shipping_method,
          envio_mxn,
          fee_mxn,
          tax_percent,
          receipt_url,
          status: "paid",
        })
        .select("id")
        .single();

      if (pedidoErr) {
        // idempotencia simple: si ya existe por unique(session_id), seguimos.
        // Podrías hacer un upsert con conflict_target = 'stripe_session_id'
        // Para simpleza, continuamos.
      }

      const pedidoId = pedidoInsert?.id || "NA";

      if (lineItems.length) {
        await supabase.from("pedido_items").insert(
          lineItems.map((it) => ({
            pedido_id: pedidoId,
            title: it.title,
            unit_amount_mxn: it.unit_amount_mxn,
            quantity: it.quantity,
          }))
        );
      }

      // Generar PDF
      const pdfBytes = await buildInvoicePDF({
        siteName,
        siteLogoUrl: siteLogo,
        pedidoId,
        sessionId: session.id,
        customerName,
        customerEmail,
        items: lineItems,
        envio_mxn,
        fee_mxn,
        tax_percent,
        amount_total_mxn,
      });
      const pdfB64 = bytesToBase64(pdfBytes);

      // HTML muy simple (ajústalo a tu diseño)
      const dinero = (n: number) =>
        new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(n);

      const itemsHtml = lineItems
        .map(
          (it) =>
            `<tr><td>${it.title}</td><td style="text-align:center;">${it.quantity}</td><td style="text-align:right;">${dinero(
              it.unit_amount_mxn
            )}</td></tr>`
        )
        .join("");

      const htmlCliente = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;">
        <div style="max-width:640px;margin:auto;padding:16px">
          <img src="${siteLogo}" alt="${siteName}" style="height:48px;margin-bottom:12px"/>
          <h2 style="margin:8px 0;">¡Gracias por tu compra!</h2>
          <p>Hemos recibido tu pago. Adjuntamos tu factura en PDF.</p>
          <p><strong>Pedido:</strong> ${pedidoId}<br/>
             <strong>Total:</strong> ${dinero(amount_total_mxn)} ${currency}<br/>
             <strong>Método de envío:</strong> ${shipping_method || "—"}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:8px">
            <thead>
              <tr style="border-bottom:1px solid #ddd">
                <th style="text-align:left">Artículo</th>
                <th style="width:80px;text-align:center">Cant.</th>
                <th style="width:120px;text-align:right">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="margin-top:12px">
            Envío: ${dinero(envio_mxn)}<br/>
            Cargo por procesamiento: ${dinero(fee_mxn)}<br/>
            ${
              tax_percent && tax_percent > 0
                ? `Impuestos (${tax_percent}%): ${dinero(
                    (lineItems.reduce(
                      (s, it) => s + it.unit_amount_mxn * it.quantity,
                      0
                    ) +
                      envio_mxn +
                      fee_mxn) *
                      (tax_percent / 100)
                  )}<br/>`
                : ""
            }
            <strong>TOTAL: ${dinero(amount_total_mxn)} ${currency}</strong>
          </p>
          ${
            receipt_url
              ? `<p>Recibo Stripe: <a href="${receipt_url}">${receipt_url}</a></p>`
              : ""
          }
        </div>
      </div>`;

      const htmlDueno = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;">
        <div style="max-width:640px;margin:auto;padding:16px">
          <h3>Nuevo pedido pagado</h3>
          <p><strong>Pedido:</strong> ${pedidoId}</p>
          <p><strong>Cliente:</strong> ${customerName || "—"} (${customerEmail || "—"})</p>
          <p><strong>Total:</strong> ${dinero(amount_total_mxn)} ${currency}</p>
          <p><strong>Envío:</strong> ${shipping_method || "—"} | ${dinero(envio_mxn)}</p>
          <p><strong>Session:</strong> ${session.id}</p>
        </div>
      </div>`;

      // Enviar correos vía Resend (REST)
      const fromHeader = `${siteName} <onboarding@resend.dev>`; // cambia a tu dominio verificado cuando lo tengas

      // Cliente
      if (customerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromHeader,
            to: [customerEmail],
            subject: `Confirmación de compra – ${siteName}`,
            html: htmlCliente,
            attachments: [
              {
                filename: `factura-${pedidoId}.pdf`,
                content: pdfB64,
              },
            ],
          }),
        });
      }

      // Dueño
      if (ownerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromHeader,
            to: [ownerEmail],
            subject: `Nuevo pedido pagado – ${siteName}`,
            html: htmlDueno,
            attachments: [
              {
                filename: `factura-${pedidoId}.pdf`,
                content: pdfB64,
              },
            ],
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Otros eventos: ignóralos
    return new Response(JSON.stringify({ ignored: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
