import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cliente con service_role porque escribe
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { order_id, carrier, tracking_code, tracking_url, status } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Falta order_id" }), { status: 400 });
    }
    if (!carrier || !tracking_code) {
      return new Response(JSON.stringify({ error: "Faltan carrier o tracking_code" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("shipments")
      .update({
        carrier,
        tracking_code,
        tracking_url: tracking_url || null,
        status: status || "shipped",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", order_id)
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