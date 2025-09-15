import os, json
from http.server import BaseHTTPRequestHandler
import stripe
from supabase import create_client

STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

stripe.api_key = STRIPE_SECRET_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", "0"))
            raw = self.rfile.read(length) if length else b""
            sig = self.headers.get("Stripe-Signature")

            event = stripe.Webhook.construct_event(
                payload=raw, sig_header=sig, secret=STRIPE_WEBHOOK_SECRET
            )

            if event["type"] == "checkout.session.completed":
                session = event["data"]["object"]
                # localizar el pedido por stripe_session_id
                pedido_id = None

                # Primero intenta por stripe_session_id
                # (si prefieres, guarda payment_intent en create_checkout_session)
                res = supabase.table("pedidos")\
                    .select("id")\
                    .eq("stripe_session_id", session["id"])\
                    .execute()
                if res.data:
                    pedido_id = res.data[0]["id"]

                if pedido_id:
                    supabase.table("pedidos").update({
                        "estado": "paid",
                        "total": (session.get("amount_total") or 0) / 100.0,
                        "email": (session.get("customer_details") or {}).get("email") or session.get("customer_email"),
                        "direccion": session.get("shipping_details"),
                        "moneda": (session.get("currency") or "mxn").lower(),
                    }).eq("id", pedido_id).execute()

                    # (Opcional) decrementar stock leyendo pedidos_items…

            elif event["type"] == "checkout.session.expired":
                session = event["data"]["object"]
                supabase.table("pedidos").update({"estado": "expired"})\
                    .eq("stripe_session_id", session["id"]).execute()

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(str(e).encode("utf-8"))
