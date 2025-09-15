// src/pages/Gracias.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShoppingBag, Home, Copy } from "lucide-react";

export default function Gracias() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const [copiado, setCopiado] = useState(false);

  // Limpia carrito y datos temporales si venimos de Stripe con session_id
  useEffect(() => {
    if (!sessionId) return;
    try {
      const ses = JSON.parse(localStorage.getItem("sesionActiva"));
      if (ses?.id) {
        localStorage.removeItem(`carrito:${ses.id}`);
        localStorage.removeItem(`envio:${ses.id}`);
        localStorage.removeItem(`metodoPago:${ses.id}`);
        // Si no quieres perder la dirección, comenta la siguiente línea:
        // localStorage.removeItem(`direccionSeleccionada:${ses.id}`);
      }
    } catch {
      /* noop */
    }
  }, [sessionId]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sessionId || "");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333] grid place-items-center px-6">
      <div className="w-full max-w-lg rounded-2xl border bg-white/85 backdrop-blur p-6 shadow-sm text-center">
        {sessionId ? (
          <>
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-2xl font-bold mt-3">¡Gracias por tu compra!</h1>
            <p className="text-sm text-gray-600 mt-1">
              Tu pago fue procesado correctamente. Te enviamos un correo de confirmación.
            </p>

            <div className="mt-4 text-left">
              <div className="text-xs text-gray-500">ID de la sesión de pago</div>
              <div className="mt-1 flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2">
                <code className="text-[12px] break-all flex-1">{sessionId}</code>
                <button
                  onClick={copiar}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                  title="Copiar"
                >
                  <Copy size={14} />
                  {copiado ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Guarda este identificador por si necesitas soporte.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/tienda")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
              >
                <ShoppingBag size={16} />
                Ver más obras
              </button>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200"
              >
                <Home size={16} />
                Ir al inicio
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
              <Home size={28} />
            </div>
            <h1 className="text-2xl font-bold mt-3">Gracias por tu visita</h1>
            <p className="text-sm text-gray-600 mt-1">
              No encontramos una sesión de pago activa. Si cancelaste, puedes intentarlo de nuevo.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/carrito")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
              >
                Volver al carrito
              </button>
              <button
                onClick={() => navigate("/tienda")}
                className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200"
              >
                Explorar tienda
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
