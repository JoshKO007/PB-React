// src/pages/MisPedidos.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Image as ImageIcon,
  Video,
  ShoppingBag,
  Brush,
  User,
  Mail,
  LogIn,
  UserPlus,
  LogOut,
  KeyRound,
  HeartIcon,
  Truck,
  Receipt,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ========== Supabase ==========
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://ousgktyljynqzrnafoqd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE"
);

/* ======================= Utils ======================= */
function buildImgUrl(pathLike) {
  if (!pathLike) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(pathLike)) return pathLike;
  if (/^\//.test(pathLike)) return pathLike;
  return `/${String(pathLike).replace(/^public\//, "")}`;
}

function money(n = 0, currency = "MXN") {
  const val = Number(n) || 0;
  const symbol = String(currency).toUpperCase() === "MXN" ? "$" : "";
  return `${symbol}${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)}`;
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

function extractItemThumbs(line_items = []) {
  const thumbs = [];
  (line_items || []).forEach((it) => {
    const src =
      it.image ||
      it.image_url ||
      (Array.isArray(it.images) ? it.images[0] : null) ||
      it.portada ||
      it.thumbnail ||
      "";
    if (src) thumbs.push(buildImgUrl(src));
  });
  return thumbs.length ? thumbs.slice(0, 5) : ["/placeholder.jpg"];
}

function getCartKeyBySession(sesion) {
  return sesion?.id ? `carrito:${sesion.id}` : null;
}
function safeCartCount(cartArray) {
  return (cartArray || []).reduce((sum, it) => {
    const qty = Number.isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 1;
    return sum + Math.max(0, qty);
  }, 0);
}

/* ======================= Header / Footer (reutiliza estilo de App.jsx) ======================= */
function SiteHeader({ usuarioActivo, setUsuarioActivo, cartCount }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  const handleUserMouseEnter = () => {
    clearTimeout(userMenuTimeout.current);
    setShowUserMenu(true);
  };
  const handleUserMouseLeave = () => {
    userMenuTimeout.current = setTimeout(() => setShowUserMenu(false), 300);
  };

  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("carrito");
        const prev = JSON.parse(localStorage.getItem("sesionActiva"));
        if (prev?.id) localStorage.removeItem(`carrito:${prev.id}`);
      } catch {}
      localStorage.removeItem("sesionActiva");
      setUsuarioActivo(null);
      setCerrandoSesion(false);
      navigate("/");
    }, 500);
  };

  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate("/") },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate("/galeria") },
    { label: "Videos", icon: <Video size={24} />, onClick: () => navigate("/videos") },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate("/tienda") },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate("/restauracion") },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate("/contacto") },
  ];

  return (
    <>
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <img src="/logo.png" alt="Logo" className="h-14 sm:h-16" />
              <div className="flex gap-2 sm:gap-6 text-lg sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
                <span>ARTE</span>
                <span>RESTAURACIÓN</span>
                <span>VISUALES</span>
              </div>
            </div>

            {/* User / carrito */}
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
                            <User size={16} /> {usuarioActivo.nombre || usuarioActivo.usuario}
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
                  <span
                    className="grid place-items-center rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md transition
                               h-11 w-11 group-hover:shadow-lg group-hover:scale-105"
                  >
                    <ShoppingBag size={22} className="text-[#a16207]" />
                  </span>

                  {cartCount > 0 && (
                    <span
                      className="absolute -right-1 -top-1 rounded-full text-[11px] font-bold
                                 bg-rose-600 text-white h-5 min-w-[20px] px-1.5 grid place-items-center
                                 ring-2 ring-white shadow"
                      style={{ lineHeight: 1 }}
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="w-full border-t border-gray-500 opacity-70 mt-2" />
          <div className="w-full border-t-2 border-gray-500 opacity-70 mt-[2px]" />

          {/* Firma */}
          <div className="text-sm italic text-gray-600 pt-1 text-right sm:text-right text-center pr-1">
            por: Laura García
          </div>

          {/* Menú */}
          <nav className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm sm:text-lg font-medium pt-2">
            {menu.map((item, index) => (
              <motion.span
                key={index}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-1 cursor-pointer px-2 sm:px-3 py-1 transition-all duration-300 ease-out
                  ${hovered === index
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
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

/* ======================= Página: MisPedidos ======================= */
export default function MisPedidos() {
  const navigate = useNavigate();

  // sesión / header sincronizado con localStorage (igual que App.jsx)
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  // pedidos
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState([]);

  // Cargar sesión
  useEffect(() => {
    try {
      const ses = JSON.parse(localStorage.getItem("sesionActiva"));
      setUsuarioActivo(ses?.id ? ses : null);
    } catch {
      setUsuarioActivo(null);
    }
  }, []);

  // Contador carrito
  useEffect(() => {
    try {
      if (!usuarioActivo?.id) {
        setCartCount(0);
        return;
      }
      const key = getCartKeyBySession(usuarioActivo);
      const cart = JSON.parse(localStorage.getItem(key)) || [];
      setCartCount(safeCartCount(cart));
    } catch {
      setCartCount(0);
    }
  }, [usuarioActivo]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "sesionActiva") {
        try {
          const sesion = JSON.parse(e.newValue);
          setUsuarioActivo(sesion?.id ? sesion : null);
        } catch {
          setUsuarioActivo(null);
        }
        return;
      }
      if (usuarioActivo?.id) {
        const myKey = getCartKeyBySession(usuarioActivo);
        if (e.key === myKey) {
          try {
            const cart = JSON.parse(e.newValue || "[]");
            setCartCount(safeCartCount(cart));
          } catch {
            setCartCount(0);
          }
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [usuarioActivo]);

  // === Cargar pedidos del usuario ===
  useEffect(() => {
    const load = async () => {
      if (!usuarioActivo?.id && !usuarioActivo?.email) {
        setLoading(false);
        setOrders([]);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        // Intento por user_id; si no hay resultados pero sí email, cae a email
        let query = supabase
          .from("orders")
          .select(
            "id, order_id, user_id, customer_email, total_mxn, moneda, status, created_at, line_items, receipt_url, order_url, tracking_code, tracking_carrier"
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (usuarioActivo?.id) query = query.eq("user_id", usuarioActivo.id);

        let { data, error } = await query;
        if (error) throw error;

        if ((!data || data.length === 0) && usuarioActivo?.email) {
          const { data: byMail, error: mailErr } = await supabase
            .from("orders")
            .select(
              "id, order_id, user_id, customer_email, total_mxn, moneda, status, created_at, line_items, receipt_url, order_url, tracking_code, tracking_carrier"
            )
            .eq("customer_email", usuarioActivo.email)
            .order("created_at", { ascending: false })
            .limit(50);
          if (mailErr) throw mailErr;
          data = byMail || [];
        }

        setOrders((data || []).map((r) => ({
          id: r.id,
          order_id: r.order_id,
          created_at: r.created_at,
          status: r.status || "paid",
          total_mxn: r.total_mxn,
          moneda: r.moneda || "MXN",
          customer_email: r.customer_email,
          line_items: r.line_items || [],
          receipt_url: r.order_url || r.receipt_url || "",
          tracking_code: r.tracking_code || "",
          tracking_carrier: r.tracking_carrier || "",
        })));
      } catch (e) {
        setErr(String(e?.message || e));
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [usuarioActivo?.id, usuarioActivo?.email]);

  // === Realtime: si actualizan tracking/status del pedido ===
  useEffect(() => {
    if (!usuarioActivo?.id && !usuarioActivo?.email) return;

    const channel = supabase
      .channel("orders-changes-user")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: usuarioActivo?.id
            ? `user_id=eq.${usuarioActivo.id}`
            : usuarioActivo?.email
            ? `customer_email=eq.${usuarioActivo.email}`
            : undefined,
        },
        (payload) => {
          const rec = payload.new || payload.old;
          if (!rec) return;
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.order_id === rec.order_id);
            const updated = {
              id: rec.id,
              order_id: rec.order_id,
              created_at: rec.created_at,
              status: rec.status || "paid",
              total_mxn: rec.total_mxn,
              moneda: rec.moneda || "MXN",
              customer_email: rec.customer_email,
              line_items: rec.line_items || [],
              receipt_url: rec.order_url || rec.receipt_url || "",
              tracking_code: rec.tracking_code || "",
              tracking_carrier: rec.tracking_carrier || "",
            };
            if (idx === -1) return [updated, ...prev];
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usuarioActivo?.id, usuarioActivo?.email]);

  // ========= Render =========
  // Stacked thumbnails component
  const ThumbsStack = ({ urls }) => {
    const list = (urls || []).slice(0, 5);
    const rots = [-6, -2, 2, 6, 0];
    return (
      <div className="relative h-24 w-40 md:h-28 md:w-48">
        {list.map((u, i) => (
          <img
            key={i}
            src={u}
            alt={`item-${i}`}
            className="absolute h-20 w-20 md:h-24 md:w-24 object-cover rounded-xl border border-white shadow-md"
            style={{
              left: `${i * 18}px`,
              top: `${i % 2 === 0 ? 0 : 8}px`,
              transform: `rotate(${rots[i % rots.length]}deg)`,
              zIndex: i + 1,
            }}
            onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
          />
        ))}
      </div>
    );
  };

  const OrdersList = () => {
    if (loading) {
      return (
        <div className="mt-8 grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border shadow-sm p-5 animate-pulse h-32" />
          ))}
        </div>
      );
    }
    if (err) {
      return (
        <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm flex items-start gap-2">
          <AlertCircle size={18} className="mt-0.5" />
          <div>{err}</div>
        </div>
      );
    }
    if (!orders.length) {
      return (
        <div className="mt-8 rounded-2xl bg-white border shadow-sm p-8 text-center">
          <p className="text-gray-700">Aún no tienes pedidos.</p>
          <button
            onClick={() => navigate("/tienda")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md"
          >
            <ShoppingBag size={16} /> Ir a la tienda
          </button>
        </div>
      );
    }

    return (
      <div className="mt-6 grid grid-cols-1 gap-4">
        {orders.map((o) => {
          const thumbs = extractItemThumbs(o.line_items);
          const firstTracking = o.tracking_code || "";
          const recUrl =
            o.receipt_url ||
            (o.order_id ? `/recibo?order=${encodeURIComponent(o.order_id)}` : "");
          const trackUrl = `/rastreo?order=${encodeURIComponent(
            o.order_id || ""
          )}${firstTracking ? `&tracking=${encodeURIComponent(firstTracking)}` : ""}`;

          return (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white border shadow-sm p-5 flex items-center gap-4"
            >
              <ThumbsStack urls={thumbs} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-500">Pedido</span>
                  <span className="text-sm font-semibold text-gray-900">{o.order_id || "—"}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{fmtDate(o.created_at)}</div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Total: {money(o.total_mxn, o.moneda)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Estado: {o.status || "Pagado"}
                  </span>
                  {firstTracking && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      <Truck size={14} /> {firstTracking}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {recUrl && (
                    <a
                      href={recUrl}
                      target={recUrl.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                    >
                      Ver comprobante <Receipt size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => navigate(trackUrl)}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                  >
                    Rastrear pedido <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              <div className="self-start">
                <button
                  onClick={() => navigate(`/recibo?order=${encodeURIComponent(o.order_id || "")}`)}
                  className="hidden md:inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md"
                >
                  Ver recibo
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col">
      {/* Header */}
      <SiteHeader
        usuarioActivo={usuarioActivo}
        setUsuarioActivo={setUsuarioActivo}
        cartCount={cartCount}
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Mis pedidos</h1>
          {loading && <Loader2 className="animate-spin text-gray-600" size={18} />}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Aquí puedes revisar el historial de tus compras, descargar comprobantes y rastrear tus envíos.
        </p>

        <OrdersList />
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}