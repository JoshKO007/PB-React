// src/pages/MisPedidos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  User,
  Mail,
  KeyRound,
  UserPlus,
  LogIn,
  LogOut,
  Heart as HeartIcon,
  Home,
  Image as ImageIcon,
  Video,
  Brush,
  Loader2,
  Receipt,
  Truck,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ousgktyljynqzrnafoqd.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================= Helpers: links ======================= */
const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

/** /recibo interno (requiere session_id). Si tienes recibo externo, se prioriza. */
function buildReceiptLink({ session_id, order_id }) {
  if (!session_id) return null;
  const qs = new URLSearchParams({
    session_id,
    ...(order_id ? { order: order_id } : {}),
  }).toString();
  return `${SITE_URL}/recibo?${qs}`;
}
function buildReceiptSmartLink({ external_receipt_url, session_id, order_id }) {
  if (external_receipt_url) return external_receipt_url;
  return buildReceiptLink({ session_id, order_id });
}

/** /rastreo interno o URL del carrier si existe */
function buildTrackingLink({ carrier_tracking_url, order_id, tracking_code }) {
  if (carrier_tracking_url) return carrier_tracking_url;
  const qs = new URLSearchParams({
    ...(order_id ? { order: order_id } : {}),
    ...(tracking_code ? { tracking: tracking_code } : {}),
  }).toString();
  return `${SITE_URL}/rastreo?${qs}`;
}

/* ======================= Helpers varias ======================= */
function buildImgFromProducto(prod) {
  // Usa la primera imagen y normaliza contra "public/obras"
  const raw = (Array.isArray(prod?.imagenes) && prod.imagenes[0]) || "";
  const cleaned = String(raw).replace(/^public\//, "");
  const withBase = cleaned.startsWith("obras/") ? cleaned : `obras/${cleaned}`;
  return `/${withBase}`;
}
function money(n, code = "MXN") {
  const sym = String(code).toUpperCase() === "MXN" ? "$" : "";
  return `${sym}${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0))}`;
}
function fmtDate(d) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return "—";
  }
}
function getUserFromLocal() {
  try {
    const s = JSON.parse(localStorage.getItem("sesionActiva") || "null");
    if (s && (s.email || s.correo)) return { id: s.id, email: s.email || s.correo, nombre: s.nombre || s.usuario };
  } catch {}
  return null;
}

/* ======================= Página ======================= */
export default function MisPedidos() {
  const navigate = useNavigate();

  // ====== Estado usuario/header ======
  const [usuarioActivo, setUsuarioActivo] = useState(getUserFromLocal());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const userMenuTimeout = useRef(null);

  // ====== Datos de pedidos ======
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pedidos, setPedidos] = useState([]);
  // Cada elemento final de "pedidos" quedará con:
  // {
  //   id, email, total, moneda, created_at, session_id,
  //   items: [{title, thumb}, ...],
  //   shipment: { tracking_code, tracking_url }  // opcional
  //   external_receipt_url // opcional, si la columna existe
  // }

  // ====== Header helpers ======
  const [cartCount, setCartCount] = useState(0);
  function getCartKeyBySession(s) {
    return s?.id ? `carrito:${s.id}` : null;
  }
  function safeCartCount(cartArray) {
    return (cartArray || []).reduce((sum, it) => sum + Math.max(0, Number(it?.cantidad) || 1), 0);
  }

  // Sincroniza sesión
  useEffect(() => {
    const onFocus = () => setUsuarioActivo(getUserFromLocal());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  // Cart badge
  useEffect(() => {
    try {
      if (!usuarioActivo?.id) {
        setCartCount(0);
        return;
      }
      const key = getCartKeyBySession(usuarioActivo);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      setCartCount(safeCartCount(cart));
    } catch {
      setCartCount(0);
    }
  }, [usuarioActivo]);

  // ====== Cargar pedidos por email ======
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setPedidos([]);
      try {
        const current = getUserFromLocal();
        if (!current?.email) {
          throw new Error("No pudimos identificar tu sesión. Inicia sesión para ver tus pedidos.");
        }

        // 1) Trae pedidos por email
        //   Incluimos session_id para poder armar /recibo interno.
        //   Si tu tabla tiene receipt_url (externo) se usa como preferencia; si no, se ignora.
        const { data: peds, error: e1 } = await supabase
          .from("pedidos")
          .select("id, email, total, moneda, created_at, session_id, receipt_url") // receipt_url es opcional
          .eq("email", current.email)
          .order("created_at", { ascending: false });

        if (e1) throw e1;
        if (!peds || peds.length === 0) {
          setPedidos([]);
          setLoading(false);
          return;
        }

        const pedidoIds = peds.map((p) => p.id);

        // 2) Items de esos pedidos
        const { data: items, error: e2 } = await supabase
          .from("pedidos_items")
          .select("pedido_id, producto_id, titulo, cantidad, unit_price")
          .in("pedido_id", pedidoIds);

        if (e2) throw e2;

        // 3) Productos involucrados (para miniaturas)
        const productIds = Array.from(
          new Set((items || []).map((it) => it.producto_id).filter(Boolean))
        );
        let productosMap = {};
        if (productIds.length > 0) {
          const { data: prods, error: e3 } = await supabase
            .from("productos")
            .select("id, imagenes, titulo")
            .in("id", productIds);
          if (e3) throw e3;
          productosMap = (prods || []).reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {});
        }

        // 4) Shipments (opcional). No guardamos links, solo datos crudos.
        let shipmentMap = {};
        try {
          const { data: ships, error: e4 } = await supabase
            .from("shipments")
            .select("order_id, tracking_code, tracking_url")
            .in("order_id", pedidoIds);

          if (e4) throw e4;
          shipmentMap = (ships || []).reduce((acc, s) => {
            acc[s.order_id] = { tracking_code: s.tracking_code || "", tracking_url: s.tracking_url || "" };
            return acc;
          }, {});
        } catch {
          // Si no existe la tabla o RLS bloquea, simplemente no habrá tracking_code/url
          shipmentMap = {};
        }

        // 5) Compacta items por pedido con miniaturas
        const itemsByPedido = new Map();
        (items || []).forEach((it) => {
          const arr = itemsByPedido.get(it.pedido_id) || [];
          if (it.producto_id && productosMap[it.producto_id]) {
            const prod = productosMap[it.producto_id];
            arr.push({
              title: it.titulo || prod.titulo || "Producto",
              thumb: buildImgFromProducto(prod),
            });
          } else if (!it.producto_id && it.titulo) {
            arr.push({
              title: it.titulo,
              thumb: "/placeholder.jpg",
            });
          }
          itemsByPedido.set(it.pedido_id, arr);
        });

        // 6) Resultado final (sin crear links aún)
        const out = peds.map((p) => ({
          id: p.id,
          email: p.email,
          total: p.total,
          moneda: p.moneda,
          created_at: p.created_at,
          session_id: p.session_id || null,
          items: itemsByPedido.get(p.id) || [],
          shipment: shipmentMap[p.id] || null,   // { tracking_code, tracking_url } | null
          external_receipt_url: p.receipt_url || null, // opcional
        }));

        setPedidos(out);
      } catch (err) {
        setError(String(err.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ======================= Header UI ======================= */
  const [hovered, setHovered] = useState(null);
  const handleUserMouseEnter = () => {
    clearTimeout(userMenuTimeout.current);
    setShowUserMenu(true);
  };
  const handleUserMouseLeave = () => {
    userMenuTimeout.current = setTimeout(() => setShowUserMenu(false), 300);
  };
  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate("/") },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate("/galeria") },
    { label: "Videos", icon: <Video size={24} />, onClick: () => navigate("/videos") },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate("/tienda") },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate("/restauracion") },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate("/contacto") },
  ];
  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("carrito");
        const prev = JSON.parse(localStorage.getItem("sesionActiva") || "null");
        if (prev?.id) localStorage.removeItem(`carrito:${prev.id}`);
      } catch {}
      localStorage.removeItem("sesionActiva");
      setCerrandoSesion(false);
      setUsuarioActivo(null);
      navigate("/");
    }, 1200);
  };

  /* ======================= Render ======================= */
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      {/* Header (copiado del App.jsx) */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">
          <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <img src="/logo.png" alt="Logo" className="h-14 sm:h-16" />
              <div className="flex gap-2 sm:gap-6 text-lg sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
                <span>ARTE</span>
                <span>RESTAURACIÓN</span>
                <span>VISUALES</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 sm:mt-0 pr-1 sm:pr-2">
              <div
                onMouseEnter={handleUserMouseEnter}
                onMouseLeave={handleUserMouseLeave}
                className="relative"
              >
                <button className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md hover:shadow-lg flex items-center">
                  <User size={24} className="text-[#333333]" />
                </button>
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onMouseEnter={handleUserMouseEnter}
                      onMouseLeave={handleUserMouseLeave}
                      className="absolute mt-2 w-60 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-white border border-gray-200 rounded-lg shadow-xl py-3 text-left z-[9999]"
                    >
                      {usuarioActivo ? (
                        <>
                          <div className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-800">
                            <User size={16} /> {usuarioActivo.nombre || usuarioActivo.email}
                          </div>
                          <button onClick={() => navigate("/usuario")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <User size={16} className="mr-2" /> Información de cuenta
                          </button>
                          <button onClick={() => navigate("/direccion")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <Mail size={16} className="mr-2" /> Direcciones
                          </button>
                          <button onClick={() => navigate("/favoritos")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <HeartIcon size={16} className="mr-2" /> Favoritos
                          </button>
                          <button onClick={() => navigate("/contrasena")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <KeyRound size={16} className="mr-2" /> Cambiar contraseña
                          </button>
                          <button onClick={cerrarSesion} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100 text-red-600">
                            <LogOut size={16} className="mr-2" /> Cerrar sesión
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => navigate("/iniciar-sesion")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <LogIn size={16} className="mr-2" /> Iniciar sesión
                          </button>
                          <button onClick={() => navigate("/registro")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <UserPlus size={16} className="mr-2" /> Crear cuenta
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {usuarioActivo && (
                <button
                  onClick={() => navigate("/carrito")}
                  className="relative group"
                  title="Carrito"
                  aria-label={`Carrito con ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}`}
                >
                  <span className="grid place-items-center rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md transition h-11 w-11 group-hover:shadow-lg group-hover:scale-105">
                    <ShoppingBag size={22} className="text-[#a16207]" />
                  </span>
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full text-[11px] font-bold bg-rose-600 text-white h-5 min-w-[20px] px-1.5 grid place-items-center ring-2 ring-white shadow" style={{ lineHeight: 1 }}>
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="w-full border-t border-gray-500 opacity-70 mt-2" />
          <div className="w-full border-t-2 border-gray-500 opacity-70 mt-[2px]" />

          <div className="text-sm italic text-gray-600 pt-1 text-right pr-1">por: Laura García</div>

          <nav className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm sm:text-lg font-medium pt-2">
            {menu.map((item, idx) => (
              <motion.span
                key={idx}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-1 cursor-pointer px-2 sm:px-3 py-1 transition-all duration-300 ease-out ${
                  hovered === idx
                    ? "bg-white/50 backdrop-blur-sm shadow-inner rounded-md scale-105 underline underline-offset-4"
                    : "hover:bg-white/30 hover:backdrop-blur-sm hover:shadow-sm hover:rounded-md"
                }`}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-[#a16207]">{item.icon}</div>
                <span>{item.label}</span>
              </motion.span>
            ))}
          </nav>
        </div>
      </motion.header>

      {/* Contenido */}
      <div className="w-full max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">Mis pedidos</h1>

        {loading && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-3">
            <Loader2 className="animate-spin" /> Cargando tus pedidos…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border bg-rose-50 p-6 shadow-sm text-rose-700 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5" /> {error}
          </div>
        )}

        {!loading && !error && pedidos.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            Aún no encontramos pedidos para tu correo.
          </div>
        )}

        {!loading && !error && pedidos.length > 0 && (
          <div className="space-y-6">
            {pedidos.map((p) => {
              // Construimos links al vuelo (sin almacenar en DB)
              const receiptHref = buildReceiptSmartLink({
                external_receipt_url: p.external_receipt_url, // si existe, se usa
                session_id: p.session_id,                      // si no hay externo, requiere esto
                order_id: p.id,
              });

              const trackingHref = buildTrackingLink({
                carrier_tracking_url: p.shipment?.tracking_url,
                order_id: p.id,
                tracking_code: p.shipment?.tracking_code,
              });

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Stack de miniaturas */}
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-40">
                        <ThumbStack items={p.items} />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Pedido</div>
                        <div className="text-lg font-semibold">{p.id}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {fmtDate(p.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Totales + acciones */}
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <div className="text-sm text-gray-600">Total</div>
                      <div className="text-xl font-bold">{money(p.total, p.moneda)}</div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Comprobante: externo o interno por session_id */}
                        {receiptHref ? (
                          <a
                            href={receiptHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                            title="Ver comprobante"
                          >
                            Ver comprobante <ExternalLink size={16} />
                          </a>
                        ) : (
                          // Si no hay externo ni session_id, ocultar; aquí dejamos botón deshabilitado
                          <button
                            disabled
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold opacity-50 cursor-not-allowed"
                            title="Comprobante no disponible"
                          >
                            Ver comprobante <Receipt size={16} />
                          </button>
                        )}

                        {/* Rastreo: carrier si existe; si no, interno con order (+ tracking_code si lo hay) */}
                        <a
                          href={trackingHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-3 py-1.5 text-sm font-semibold shadow hover:shadow-md"
                          title="Rastrear envío"
                        >
                          Rastrear pedido <Truck size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

/* ======================= Subcomponentes ======================= */

// Muestra hasta 4 thumbs rotadas/escalonadas sin taparse
function ThumbStack({ items }) {
  const thumbs = (items || [])
    .map((it) => it.thumb)
    .filter(Boolean)
    .slice(0, 4);

  if (thumbs.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center rounded-xl border bg-gray-50 text-gray-400 text-xs">
        Sin imágenes
      </div>
    );
  }

  const positions = [
    { r: -6, x: 0, y: 0, z: 40 },
    { r: 4, x: 10, y: 8, z: 30 },
    { r: -2, x: 20, y: 16, z: 20 },
    { r: 6, x: 30, y: 24, z: 10 },
  ];

  return (
    <div className="absolute inset-0">
      {thumbs.map((src, i) => {
        const p = positions[i] || positions[positions.length - 1];
        return (
          <img
            key={i}
            src={src}
            onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
            alt={`artículo ${i + 1}`}
            className="absolute h-24 w-24 object-cover rounded-xl border shadow-md"
            style={{
              transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`,
              zIndex: p.z,
            }}
          />
        );
      })}
    </div>
  );
}