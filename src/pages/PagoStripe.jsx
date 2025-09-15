import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PRODUCTOS_JSON from "../data/productos.json";

function getPrecioFinal(precio, descuento=0){
  const pct = Math.max(0, Math.min(100, Number(descuento)||0));
  return Math.round(precio*(1-pct/100)*100)/100;
}

export default function PagoStripe() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [msg, setMsg] = useState("Preparando checkout…");

  useEffect(() => {
    try {
      const ses = JSON.parse(localStorage.getItem("sesionActiva"));
      if (!ses?.id) { navigate("/iniciar-sesion"); return; }
      setUsuario(ses);
    } catch {}
  }, [navigate]);

  const rawCart = useMemo(() => {
    if (!usuario?.id) return [];
    try { return JSON.parse(localStorage.getItem(`carrito:${usuario.id}`) || "[]") || []; }
    catch { return []; }
  }, [usuario]);

  const envioElegido = useMemo(() => {
    if (!usuario?.id) return "estandar";
    try { return localStorage.getItem(`envio:${usuario.id}`) || "estandar"; }
    catch { return "estandar"; }
  }, [usuario]);

  const email = usuario?.email || usuario?.correo || "";

  const items = useMemo(() => {
    return (rawCart || []).map(c => {
      const p = (PRODUCTOS_JSON || []).find(pp => pp.id === c.id);
      if (!p) return null;
      const qty = Math.max(1, Number(c.cantidad || 1));
      const unit = getPrecioFinal(p.precio, p.descuento);
      return { title: p.titulo, unit_amount: unit, quantity: qty };
    }).filter(Boolean);
  }, [rawCart]);

  useEffect(() => {
    const go = async () => {
      if (!usuario?.id) return;
      if (!items.length) { navigate("/carrito"); return; }

      setMsg("Creando sesión de pago…");
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            items,
            shipping: envioElegido, // "estandar" | "express" | "retiro"
            customer_email: email || undefined,
            success_url: `${window.location.origin}/gracias?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${window.location.origin}/carrito`,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.url) {
          console.error("Stripe error:", data);
          setMsg("No se pudo crear el checkout. Intenta de nuevo.");
          return;
        }
        window.location.href = data.url; // redirige a Stripe
      } catch (e) {
        console.error(e);
        setMsg("Error de red. Intenta de nuevo.");
      }
    };
    go();
  }, [usuario, items, envioElegido, email, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#f9f4ef] text-[#333]">
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">{msg}</div>
    </div>
  );
}
