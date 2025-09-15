// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "npm:stripe@16.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Helpers
const toCents = (mxn: number) => Math.round(Number(mxn) * 100);

type Item = {
  /** ID interno de tu producto (opcional pero recomendado para el webhook) */
  id?: string;
  title: string;
  unit_amount: number; // en MXN
  quantity: number;
};

type Body = {
  items: Item[];
  shipping: "estandar" | "express" | "retiro";
  customer_email?: string;
  /** Usa el placeholder de Stripe: https://tu-sitio/gracias?session_id={CHECKOUT_SESSION_ID} */
  success_url: string;
  cancel_url: string;
  /** IVA u otro impuesto manual (ej. 16 = 16%) — opcional */
  tax_percent?: number;
  /** Para ligar pedido al usuario en tu BD — opcional */
  usuario_id?: string;
};

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    const {
      items = [],
      shipping = "estandar",
      customer_email,
      success_url,
      cancel_url,
      tax_percent,
      usuario_id,
    } = (await req.json()) as Body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "Missing success_url or cancel_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Items de producto (incluye metadata con producto_id para el webhook)
    const productItems = items.map((it) => ({
      price_data: {
        currency: "mxn",
        product_data: {
          name: it.title,
          // 🔸 Esto permite que el webhook recupere y guarde producto_id en pedidos_items
          metadata: it.id ? { producto_id: String(it.id) } : {},
        },
        unit_amount: toCents(it.unit_amount), // MXN -> centavos
      },
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));

    // 2) Envío (se muestra en el bloque de envío de Checkout)
    const envioMXN =
      shipping === "express" ? 350 :
      shipping === "retiro"  ?   0 :
                                 200;

    const shippingName =
      shipping === "retiro" ? "Retiro en taller" :
      shipping === "express" ? "Envío express"   :
                               "Envío estándar";

    const shippingOption = [{
      shipping_rate_data: {
        display_name: shippingName,
        type: "fixed_amount",
        fixed_amount: { amount: toCents(envioMXN), currency: "mxn" },
        delivery_estimate: shipping === "retiro"
          ? undefined
          : {
              minimum: { unit: "business_day", value: shipping === "express" ? 1 : 3 },
              maximum: { unit: "business_day", value: shipping === "express" ? 2 : 6 },
            },
      },
    }];

    // 3) Comisión por tarjeta (3.6% + $3 MXN) como línea adicional
    //    La calculamos sobre (subtotal productos + envío) para que coincida con tu UI.
    const subtotalProductosMXN = items.reduce(
      (s, it) => s + Number(it.unit_amount) * Math.max(1, Number(it.quantity || 1)),
      0
    );
    const baseComisionMXN = subtotalProductosMXN + envioMXN;
    const feeStripeMXN = Math.round((baseComisionMXN * 0.036 + 3) * 100) / 100; // 2 decimales

    const feeItem = feeStripeMXN > 0 ? [{
      price_data: {
        currency: "mxn",
        product_data: { name: "Cargo por procesamiento (tarjeta)" },
        unit_amount: toCents(feeStripeMXN),
      },
      quantity: 1,
    }] : [];

    // 4) (Opcional) Impuesto manual total como línea extra
    //    Si prefieres Stripe Tax en el futuro, activa automatic_tax y configura impuestos en Stripe.
    const taxItem = (tax_percent && tax_percent > 0)
      ? (() => {
          const taxBase = subtotalProductosMXN + envioMXN + feeStripeMXN;
          const taxMXN = Math.round((taxBase * (tax_percent / 100)) * 100) / 100;
          return taxMXN > 0 ? [{
            price_data: {
              currency: "mxn",
              product_data: { name: `Impuestos (${tax_percent}%)` },
              unit_amount: toCents(taxMXN),
            },
            quantity: 1,
          }] : [];
        })()
      : [];

    const line_items = [
      ...productItems,
      ...feeItem,
      ...taxItem,
      // *Nota*: el envío va en shipping_options (no como line item).
    ];

    // 5) Crear sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url, // usa {CHECKOUT_SESSION_ID} si quieres obtenerla en /gracias
      cancel_url,
      locale: "es-419",
      customer_email: customer_email || undefined,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["MX"] },
      shipping_options: shippingOption,
      allow_promotion_codes: true,

      // ✅ Metadata a nivel de sesión (el webhook la lee aquí)
      metadata: {
        shipping_metodo: shipping,
        usuario_id: usuario_id || "",
        tax_percent: tax_percent ? String(tax_percent) : "",
        envio_mxn: String(envioMXN),
        fee_mxn: String(feeStripeMXN),
      },

      payment_intent_data: {
        // Esto ayuda a que Stripe envíe recibo al cliente (habilita email receipts en Dashboard)
        receipt_email: customer_email || undefined,
        // Puedes duplicar metadata aquí si quieres verla también en el PaymentIntent
        metadata: {
          shipping: shipping,
          envio_mxn: String(envioMXN),
          fee_mxn: String(feeStripeMXN),
          tax_percent: tax_percent ? String(tax_percent) : "",
          usuario_id: usuario_id || "",
        },
      },

      // Si en el futuro usas Stripe Tax:
      // automatic_tax: { enabled: true }, // y marca precios como "exclusive" en price_data
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
