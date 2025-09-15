// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "npm:stripe@16.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, init?: number) {
  return new Response(JSON.stringify(data), { status: init ?? 200, headers: cors });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // === ENV SECRETS ===
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY"); // OJO: no usar prefijo SUPABASE_
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "josholo@yahoo.com";
  const SITE_NAME = Deno.env.get("SITE_NAME") || "Tu Tienda";
  const SITE_LOGO_URL = Deno.env.get("SITE_LOGO_URL") || "";
  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
  const FROM_NAME = Deno.env.get("FROM_NAME") || SITE_NAME;
  const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "";

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SERVICE_ROLE_KEY) {
    return json({ error: "Faltan secrets requeridos" }, 500);
  }

  // === Stripe: verificar firma del webhook ===
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Firma inválida:", err);
    return json({ error: "Invalid signature" }, 400);
  }

  // === Solo nos interesa checkout.session.completed ===
  if (event.type !== "checkout.session.completed") {
    return json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    // Obtener line items con producto expandido (para leer metadata.producto_id)
    const li = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
      limit: 100,
    });

    // Preparar items
    const items = li.data.map((row) => {
      const price = row.price!;
      const unit_amount = (price.unit_amount ?? 0) / 100;
      const quantity = row.quantity ?? 1;

      // producto_id desde metadata si existe
      let producto_id: string | null = null;
      const prod = price.product;
      if (prod && typeof prod === "object" && "metadata" in prod && prod.metadata) {
        producto_id = (prod.metadata as any).producto_id ?? null;
      }

      return {
        producto_id,
        titulo: row.description || (typeof price.nickname === "string" ? price.nickname : "Producto"),
        cantidad: quantity,
        unit_price: unit_amount,
        subtotal: unit_amount * quantity,
      };
    });

    const total_mxn = (session.amount_total ?? 0) / 100;
    const moneda = session.currency?.toUpperCase() || "MXN";
    const email = session.customer_details?.email || session.customer_email || "";

    // Dirección (si el cliente la proporcionó)
    const direccion = session.shipping_details
      ? {
          nombre: session.shipping_details.name,
          phone: session.shipping_details.phone,
          address: session.shipping_details.address,
        }
      : null;

    // Shipping método desde metadata de la sesión (si lo enviaste en create-checkout)
    const shipping_metodo = (session.metadata && (session.metadata as any).shipping_metodo) || null;

    // === Guardar en BD ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    // 1) Insert pedido
    const { data: pedido, error: insErr } = await supabase
      .from("pedidos")
      .insert({
        usuario_id: (session.metadata && (session.metadata as any).usuario_id) || null,
        email,
        total: total_mxn,
        moneda,
        estado: "pagado",
        stripe_session_id: session.id,
        shipping_metodo,
        direccion: direccion ? direccion : null,
      })
      .select("*")
      .single();

    if (insErr) throw insErr;

    // 2) Insert items
    const itemsRows = items.map((it) => ({
      pedido_id: pedido.id,
      producto_id: it.producto_id,
      titulo: it.titulo,
      cantidad: it.cantidad,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
    }));

    const { error: itemsErr } = await supabase.from("pedidos_items").insert(itemsRows);
    if (itemsErr) throw itemsErr;

    // === Email (Resend) — simple HTML (sin PDF para mantenerlo corto aquí) ===
    if (RESEND_API_KEY && email) {
      const fmt = (n: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda }).format(n);

      const itemsHtml = items
        .map(
          (it) => `
            <tr>
              <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.titulo}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.cantidad}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee">${fmt(it.unit_price)}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(it.subtotal)}</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <div style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;">
          <div style="max-width:560px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
            <div style="text-align:center;margin-bottom:12px">
              ${SITE_LOGO_URL ? `<img src="${SITE_LOGO_URL}" alt="${SITE_NAME}" style="height:56px" />` : `<h2>${SITE_NAME}</h2>`}
            </div>
            <h3 style="margin:12px 0">¡Gracias por tu compra!</h3>
            <p>Tu pago se ha confirmado correctamente.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:12px">
              <thead>
                <tr>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd">Artículo</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd">Cant.</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd">Precio</th>
                  <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #ddd">Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:8px 8px;text-align:right;font-weight:600">Total</td>
                  <td style="padding:8px 8px;text-align:right;font-weight:700">${fmt(total_mxn)}</td>
                </tr>
              </tfoot>
            </table>
            ${PUBLIC_SITE_URL ? `<p style="margin-top:16px"><a href="${PUBLIC_SITE_URL}/gracias?session_id=${encodeURIComponent(session.id)}">Ver pedido</a></p>` : ""}
            <p style="color:#666;font-size:12px;margin-top:16px">Pedido ID: ${pedido.id}</p>
          </div>
        </div>
      `;

      // Enviar al cliente
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [email],
          subject: `Confirmación de compra — ${SITE_NAME}`,
          html,
        }),
      }).catch((e) => console.error("Resend cliente error:", e));

      // Copia al dueño
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [OWNER_EMAIL],
          subject: `Nueva venta — ${SITE_NAME}`,
          html: `<p>Se confirmó una compra</p>${html}`,
        }),
      }).catch((e) => console.error("Resend owner error:", e));
    }

    return json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return json({ error: String(e) }, 500);
  }
});
