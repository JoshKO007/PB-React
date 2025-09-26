// supabase/functions/track-shipment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

serve(async (req) => {
  // 1) Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    // 2) Lee parámetros de forma segura (POST JSON o GET querystring)
    let order_id = "";
    let tracking_code = "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      order_id = url.searchParams.get("order_id") ?? "";
      tracking_code = url.searchParams.get("tracking_code") ?? "";
    } else {
      let body: any = {};
      try { body = await req.json(); } catch { body = {}; }
      order_id = body?.order_id ?? "";
      tracking_code = body?.tracking_code ?? "";
    }

    if (!order_id && !tracking_code) {
      return new Response(JSON.stringify({ error: "Debes enviar order_id o tracking_code" }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    let q = supabase.from("shipments").select("*").order("created_at", { ascending: false });

    if (tracking_code) q = q.eq("tracking_code", tracking_code);
    else q = q.eq("order_id", order_id);

    const { data, error } = await q.single();
    if (error) throw error;

    return new Response(JSON.stringify({ data }), { status: 200, headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});