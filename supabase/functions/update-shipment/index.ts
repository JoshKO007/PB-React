// supabase/functions/update-shipment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405, headers: CORS_HEADERS });

  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const order_id = body?.order_id || "";
    const carrier = body?.carrier || "";
    const tracking_code = body?.tracking_code || "";
    const tracking_url = body?.tracking_url || null;
    const status = body?.status || "shipped";

    if (!order_id) return new Response(JSON.stringify({ error: "Falta order_id" }), { status: 400, headers: CORS_HEADERS });
    if (!carrier || !tracking_code) return new Response(JSON.stringify({ error: "Faltan carrier o tracking_code" }), { status: 400, headers: CORS_HEADERS });

    const { data, error } = await supabase
      .from("shipments")
      .update({ carrier, tracking_code, tracking_url, status, updated_at: new Date().toISOString() })
      .eq("order_id", order_id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ data }), { status: 200, headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: CORS_HEADERS });
  }
});