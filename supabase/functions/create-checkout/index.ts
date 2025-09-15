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

type Item = { title: string; unit_amount: number; quantity: number };
type Body = {
  items: Item[];
  shipping: "estandar" | "express" | "retiro";
  customer_email?: string;
  success_url: string;
  cancel_url: string;
  /** Opcional: IVA u otro impuesto manual (ej. 16 = 16%) */
  tax_percent?: number;
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
    } = (await req.json()) as Body;

    // 1) Items de producto
    const productItems = (items || []).map((it) => ({
      price_data: {
        currency: "mxn",
        product_data: { name: it.title },
        unit_amount: toCents(it.unit_amount), // MXN -> centavos
      },
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));

    // 2) Envío (como shipping option para que Stripe lo muestre en su bloque de envío)
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
    const subtotalProductosMXN = (items || []).reduce(
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
      success_url,
      cancel_url,
      locale: "es-419",
      customer_email: customer_email || undefined,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["MX"] },
      shipping_options: shippingOption,
      allow_promotion_codes: true,
      payment_intent_data: {
        // Esto hace que Stripe envíe recibo al cliente (habilita email receipts en Dashboard)
        receipt_email: customer_email || undefined,
        metadata: {
          shipping: shipping,
          envio_mxn: String(envioMXN),
          fee_mxn: String(feeStripeMXN),
          tax_percent: tax_percent ? String(tax_percent) : "",
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
