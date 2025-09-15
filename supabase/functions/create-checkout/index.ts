// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "npm:stripe@16.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // 1) Preflight
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
    const { items = [], shipping = "estandar", customer_email, success_url, cancel_url } = await req.json();

    const line_items = items.map((it: any) => ({
      price_data: {
        currency: "mxn",
        product_data: { name: it.title },
        unit_amount: Math.round(Number(it.unit_amount) * 100), // MXN -> centavos
      },
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));

    // costo de envío fijo según selección
    const envioMx =
      shipping === "express" ? 35000 :
      shipping === "retiro"  ? 0 :
      20000;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer_email || undefined,
      line_items,
      shipping_address_collection: { allowed_countries: ["MX"] },
      shipping_options: [{
        shipping_rate_data: {
          display_name: shipping === "retiro" ? "Retiro en taller" : (shipping === "express" ? "Envío express" : "Envío estándar"),
          type: "fixed_amount",
          fixed_amount: { amount: envioMx, currency: "mxn" },
          delivery_estimate: shipping === "retiro" ? undefined : {
            minimum: { unit: "business_day", value: shipping === "express" ? 1 : 3 },
            maximum: { unit: "business_day", value: shipping === "express" ? 2 : 6 },
          },
        },
      }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      locale: "es-419",
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
