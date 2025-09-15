import os, json
from http.server import BaseHTTPRequestHandler
import stripe
from supabase import create_client

# ENV (configúralos en Vercel → Settings → Environment Variables)
STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

stripe.api_key = STRIPE_SECRET_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def _cors_headers():
    # Cambia el origen a tu dominio si quieres cerrarlo
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "OPTIONS, POST"
    }

def precio_final_cents(precio: float, descuento: float | None):
    pct = max(0.0, min(100.0, float(descuento or 0)))
    return round(precio * (1 - pct/100.0) * 100)

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in _cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw.decode("utf-8") or "{}")

            user_id   = body.get("userId")
            cart      = body.get("cart", [])              # [{id, cantidad}]
            envio     = body.get("envio", "estandar")     # estandar|express|retiro
            direccion = body.get("direccion")             # snapshot
            cupon     = body.get("cupon")

            if not cart:
                raise ValueError("Carrito vacío")

            # 1) Traer productos desde Supabase
            ids = [str(i["id"]) for i in cart]
            q = supabase.table("productos").select(
                "id,titulo,precio,moneda,descuento,imagenes"
            ).in_("id", ids).execute()
            prods = q.data or []
            if not prods:
                raise ValueError("Productos no encontrados")

            # 2) Crear pedido (estado created)
            ped = supabase.table("pedidos").insert({
                "usuario_id": user_id,
                "email": (direccion or {}).get("email"),
                "total": None,
                "stripe_session_id": None,
                "shipping_metodo": envio,
                "direccion": direccion,
                "moneda": (prods[0].get("moneda") or "MXN").lower(),
                "estado": "created",
            }).execute().data[0]
            pedido_id = ped["id"]

            # 3) Line items y snapshot de items
            line_items = []
            items_snapshot = []
            for item in cart:
                p = next((pp for pp in prods if str(pp["id"]) == str(item["id"])), None)
                if not p:
                    raise ValueError(f"Producto no encontrado: {item['id']}")
                qty = max(1, int(item.get("cantidad") or 1))
                unit_amount = precio_final_cents(float(p["precio"]), p.get("descuento"))
                currency = (p.get("moneda") or "MXN").lower()

                line_items.append({
                    "quantity": qty,
                    "price_data": {
                        "currency": currency,
                        "unit_amount": unit_amount,
                        "product_data": {
                            "name": p["titulo"],
                            "images": (p.get("imagenes") or [])[:1],
                            "metadata": {"product_id": str(p["id"])},
                        },
                    },
                })

                items_snapshot.append({
                    "pedido_id": pedido_id,
                    "producto_id": str(p["id"]),
                    "titulo": p["titulo"],
                    "cantidad": qty,
                    "unit_price": unit_amount / 100.0,
                    "subtotal": (unit_amount / 100.0) * qty,
                })

            if items_snapshot:
                supabase.table("pedidos_items").insert(items_snapshot).execute()

            # 4) Crear Checkout Session
            # En Vercel, usa tu dominio del frontend (o window.location.origin).
            origin = body.get("origin") or "https://tu-dominio.com"
            params = {
                "mode": "payment",
                "line_items": line_items,
                "allow_promotion_codes": True,
                "billing_address_collection": "auto",
                "shipping_address_collection": {"allowed_countries": ["MX", "US", "CA"]},
                "shipping_options": [
                    {"shipping_rate_data": {"type": "fixed_amount", "fixed_amount": {"amount": 20000, "currency": "mxn"}, "display_name": "Estándar (3–6 días)"}},
                    {"shipping_rate_data": {"type": "fixed_amount", "fixed_amount": {"amount": 35000, "currency": "mxn"}, "display_name": "Express (1–2 días)"}},
                    {"shipping_rate_data": {"type": "fixed_amount", "fixed_amount": {"amount": 0, "currency": "mxn"},   "display_name": "Retiro en taller"}},
                ],
                "success_url": f"{origin}/pago/exito?session_id={{CHECKOUT_SESSION_ID}}",
                "cancel_url": f"{origin}/pago/cancelado",
                "metadata": {"pedido_id": str(pedido_id), "user_id": str(user_id or "")},
            }
            if direccion and direccion.get("email"):
                params["customer_email"] = direccion["email"]
            # Si mapeas cupones propios a promotion_codes de Stripe, agrégalos aquí:
            # if cupon: params["discounts"] = [{"promotion_code": "promo_xxx"}]

            session = stripe.checkout.Session.create(**params)

            # 5) Actualizar pedido → pending
            supabase.table("pedidos").update({
                "stripe_session_id": session.id,
                "total": (session.amount_total or 0) / 100.0 if session.amount_total else None,
                "estado": "pending",
            }).eq("id", pedido_id).execute()

            out = {"url": session.url, "sessionId": session.id, "pedidoId": pedido_id}
            payload = json.dumps(out).encode("utf-8")

            self.send_response(200)
            for k, v in {**_cors_headers(), "Content-Type": "application/json"}.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(payload)

        except Exception as e:
            self.send_response(500)
            for k, v in {**_cors_headers(), "Content-Type": "application/json"}.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
