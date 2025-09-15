// supabase/functions/create-checkout/index.ts
// IMPORTANTE: esto es SOLO en la Edge Function, NO en React.
import Stripe from "npm:stripe@16.6.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

type Item = {
  title: string;
  unit_amount: number; // MXN en pesos (ej: 199.99)
  quantity: number;
};

type Body = {
  items: Item[];
  shipping?: "estandar" | "express" | "retiro";
  customer_email?: string;
  success_url: string;
  cancel_url: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const { items, shipping, customer_email, success_url, cancel_url } = (await req.json()) as Body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items" }), { status: 400 });
    }

    // Mapea a line_items con cents
    const line_items = items.map((it) => ({
      price_data: {
        currency: "mxn",
        product_data: { name: it.title.slice(0, 126) },
        unit_amount: Math.round(Number(it.unit_amount) * 100), // a centavos
      },
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));

    // Opciones de envío fijas (una sola opción según lo elegido)
    const shipping_options =
      shipping === "retiro"
        ? []
        : [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                  amount: shipping === "express" ? 35000 : 20000, // $350 o $200 MXN en centavos
                  currency: "mxn",
                },
                display_name: shipping === "express" ? "Envío express (1–2 días)" : "Envío estándar (3–6 días)",
              },
            },
          ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email,
      // Si necesitas dirección de envío:
      shipping_address_collection: { allowed_countries: ["MX", "US", "CA"] },
      shipping_options,
      success_url: success_url, // e.g. https://tu-sitio.com/gracias?session_id={CHECKOUT_SESSION_ID}
      cancel_url: cancel_url,   // e.g. https://tu-sitio.com/carrito
      // Opcional:
      // allow_promotion_codes: true,
      // metadata: { usuario_id: "..." }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
