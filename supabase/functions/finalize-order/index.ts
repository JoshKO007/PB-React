// supabase/functions/finalize-order/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "npm:stripe@16.6.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Line = { title: string; quantity: number; unit_amount_mxn: number; subtotal_mxn: number };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { session_id } = await req.json().catch(() => ({}));
    if (!session_id) {
      return new Response(JSON.stringify({ error: "Falta session_id" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
    const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "";

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Faltan secrets del servidor" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    // 1) Leer la sesión de Stripe y validar que esté pagada
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items", "payment_intent", "payment_intent.charges.data"],
    });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "La sesión no está pagada" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2) Preparar datos del pedido
    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    const charge = pi?.charges?.data?.[0];

    const envio_mxn = Number(pi?.metadata?.envio_mxn || session.metadata?.envio_mxn || 0);
    const fee_mxn   = Number(pi?.metadata?.fee_mxn   || session.metadata?.fee_mxn   || 0);
    const tax_pct   = session.metadata?.tax_percent
      ? Number(session.metadata.tax_percent)
      : (pi?.metadata?.tax_percent ? Number(pi.metadata.tax_percent) : null);
    const shipping_metodo = (pi?.metadata?.shipping || session.metadata?.shipping || "") as string;

    const lines: Line[] = (session.line_items?.data || []).map(li => ({
      title: li.description || "Artículo",
      quantity: li.quantity || 1,
      unit_amount_mxn: (li.price?.unit_amount || 0) / 100,
      subtotal_mxn: ((li.price?.unit_amount || 0) / 100) * (li.quantity || 1),
    }));

    const subtotal_mxn = lines.reduce((s, l) => s + l.subtotal_mxn, 0);
    const tax_mxn = tax_pct ? Math.round(((subtotal_mxn + envio_mxn + fee_mxn) * (tax_pct / 100)) * 100) / 100 : 0;
    const total_mxn = (session.amount_total || 0) / 100; // fuente de la verdad

    const direccion = {
      name: session.customer_details?.name || null,
      email: session.customer_details?.email || session.customer_email || null,
      address: session.customer_details?.address || null,
    };

    // 3) Guardar en BD (idempotente por stripe_session_id)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Asegúrate de tener un índice único en stripe_session_id:
    // create unique index if not exists ux_pedidos_session on public.pedidos(stripe_session_id);
    const { data: pedidoRow, error: upsertErr } = await supabase
      .from("pedidos")
      .upsert({
        stripe_session_id: session.id,
        usuario_id: session.metadata?.usuario_id || null,
        email: direccion.email,
        total: total_mxn,
        moneda: (session.currency || "mxn").toUpperCase(),
        estado: "paid",
        shipping_metodo,
        direccion,
      }, { onConflict: "stripe_session_id" })
      .select("id")
      .single();

    if (upsertErr) {
      return new Response(JSON.stringify({ error: "No se pudo guardar el pedido", details: upsertErr.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const pedido_id = pedidoRow.id;

    // Remove & insert items para idempotencia simple
    await supabase.from("pedidos_items").delete().eq("pedido_id", pedido_id);
    await supabase.from("pedidos_items").insert(
      lines.map(l => ({
        pedido_id,
        producto_id: null,          // si quieres guardar el id real, manda product_id en price_data.metadata en create-checkout
        titulo: l.title,
        cantidad: l.quantity,
        unit_price: l.unit_amount_mxn,
        subtotal: l.subtotal_mxn,
      }))
    );

    // 4) Regresar payload listo para EmailJS en el cliente
    const payloadForEmail = {
      pedido_id,
      owner_email: OWNER_EMAIL || "",
      customer_email: direccion.email || "",
      customer_name: direccion.name || "",
      total_mxn,
      moneda: (session.currency || "mxn").toUpperCase(),
      shipping_metodo,
      envio_mxn,
      fee_mxn,
      tax_pct: tax_pct || 0,
      tax_mxn,
      subtotal_mxn,
      line_items: lines, // lo usarás para renderizar en el template
    };

    return new Response(JSON.stringify({ ok: true, data: payloadForEmail }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
