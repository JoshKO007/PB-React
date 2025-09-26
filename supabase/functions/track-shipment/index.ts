import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Puede ser anon porque solo lee
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

serve(async (req) => {
  try {
    const { order_id, tracking_code } = await req.json();

    if (!order_id && !tracking_code) {
      return new Response(
        JSON.stringify({ error: "Debes enviar order_id o tracking_code" }),
        { status: 400 }
      );
    }

    let query = supabase.from("shipments").select("*").order("created_at", { ascending: false });

    if (tracking_code) {
      query = query.eq("tracking_code", tracking_code);
    } else {
      query = query.eq("order_id", order_id);
    }

    const { data, error } = await query.single();
    if (error) throw error;

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
    });
  }
});