import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cliente con service_role porque va a escribir en la BD
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Generador de código provisional
function generateTracking(orderId: string) {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ARV-${orderId.slice(-6).toUpperCase()}-${rand}`;
}

serve(async (req) => {
  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Falta order_id" }), { status: 400 });
    }

    const tracking_code = generateTracking(order_id);

    const { data, error } = await supabase
      .from("shipments")
      .insert([
        {
          order_id,
          carrier: "INTERNAL",
          tracking_code,
          status: "created",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
    });
  }
});