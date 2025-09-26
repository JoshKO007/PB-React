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

// ===== Supabase (mismos datos que en App.jsx) =====
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://ousgktyljynqzrnafoqd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE"
);

/* ======================= Helpers imágenes / UI ======================= */
function buildImgUrl(pathLike) {
  if (!pathLike) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(pathLike)) return pathLike;
  if (/^\//.test(pathLike)) return pathLike;
  return `/${String(pathLike).replace(/^public\//, "")}`;
}
function money(n, code = "MXN") {
  const symbol = String(code).toUpperCase() === "MXN" ? "$" : "";
  return `${symbol}${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0))}`;
}
function stackAngle(i) {
  const angles = [-6, -2, 2, 6];
  return angles[i % angles.length];
}

/* ======================= Página ======================= */
export default function MisPedidos() {
  const navigate = useNavigate();

  // ======= sesión local: tomamos id y email para filtrar =======
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sesionActiva") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pedidos, setPedidos] = useState([]); // [{order, items[], shipment?}]

  // ======= Header state (copiado de App.jsx) =======
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuTimeout = useRef(null);
  const [cartCount, setCartCount] = useState(0);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate("/") },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate("/galeria") },
    { label: "Videos", icon: <Video size={24} />, onClick: () => navigate("/videos") },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate("/tienda") },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate("/restauracion") },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate("/contacto") },
  ];
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
      setUsuario(null);
      setCartCount(0);
      setCerrandoSesion(false);
      navigate("/");
    }, 1500);
  };
  function getCartKeyBySession(sesion) {
    return sesion?.id ? `carrito:${sesion.id}` : null;
  }
  function safeCartCount(cartArray) {
    return (cartArray || []).reduce((sum, it) => {
      const qty = Number.isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 1;
      return sum + Math.max(0, qty);
    }, 0);
  }
  // sincroniza user y carrito
  useEffect(() => {
    const onFocus = () => {
      try {
        const s = JSON.parse(localStorage.getItem("sesionActiva") || "null");
        setUsuario(s?.id ? s : null);
        if (s?.id) {
          const key = getCartKeyBySession(s);
          const cart = JSON.parse(localStorage.getItem(key) || "[]");
          setCartCount(safeCartCount(cart));
        } else setCartCount(0);
      } catch {
        setUsuario(null);
        setCartCount(0);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /* ================== Carga de pedidos ================== */
  const loadOrders = async () => {
    setLoading(true);
    setErr("");

    // Tomamos uid y email para filtrar
    const uid = usuario?.id || null;
    const email = usuario?.email || usuario?.correo || usuario?.mail || null;

    try {
      // 1) Pedidos por usuario_id OR email
      let q = supabase
        .from("pedidos")
        .select("id, usuario_id, email, total, moneda, created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      if (uid || email) {
        const parts = [];
        if (uid) parts.push(`usuario_id.eq.${uid}`);
        if (email) parts.push(`email.eq.${email}`);
        // si hay ambos, los unimos con OR
        if (parts.length) q = q.or(parts.join(","));
      } else {
        // si no tenemos ni uid ni email, no podemos traer nada "del usuario":
        setPedidos([]);
        setLoading(false);
        return;
      }

      const { data: orders, error } = await q;
      if (error) throw error;

      if (!orders?.length) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      const orderIds = orders.map((o) => o.id);

      // 2) Ítems de esos pedidos
      const { data: items, error: errItems } = await supabase
        .from("pedidos_items")
        .select("id,pedido_id,titulo,imagen,imagenes,producto_id,cantidad,unit_price")
        .in("pedido_id", orderIds);

      if (errItems) throw errItems;

      // 3) Shipments (si existe la tabla)
      let shipments = [];
      try {
        const { data: sh } = await supabase
          .from("shipments")
          .select("order_id,tracking_code,carrier,tracking_url,status,updated_at")
          .in("order_id", orderIds);
        shipments = sh || [];
      } catch {
        shipments = [];
      }

      // 4) Armar estructura
      const byOrder = {};
      orders.forEach((o) => {
        byOrder[o.id] = { order: o, items: [], shipment: null };
      });

      (items || []).forEach((it) => {
        const pid = it.pedido_id;
        if (byOrder[pid]) byOrder[pid].items.push(it);
      });

      (shipments || []).forEach((s) => {
        if (byOrder[s.order_id]) byOrder[s.order_id].shipment = s;
      });

      setPedidos(Object.values(byOrder));
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y cuando cambie usuario
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, usuario?.email]);

  // Realtime: si cambian pedidos / items / shipments del usuario, recargar
  useEffect(() => {
    const ch = supabase
      .channel("mis-pedidos-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, loadOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos_items" }, loadOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, loadOrders)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  /* ================== UI helpers ================== */
  function thumbsForCard(items = []) {
    // intenta usar imagenes[0] o imagen; máximo 4
    const imgs = [];
    for (const it of items) {
      const arr = Array.isArray(it.imagenes) ? it.imagenes : [];
      const first = arr[0] || it.imagen || null;
      if (first) imgs.push(buildImgUrl(first));
      if (imgs.length >= 4) break;
    }
    if (!imgs.length) imgs.push("/placeholder.jpg");
    return imgs;
  }

  const emptyState = !loading && pedidos.length === 0;

  /* ================== Render ================== */
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      {/* ===== HEADER (igual look & feel) ===== */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">
          <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <img src="/logo.png" alt="Logo" className="h-14 sm:h-16" />
              <div className="flex gap-2 sm:gap-6 text-lg sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
                <span>ARTE</span><span>RESTAURACIÓN</span><span>VISUALES</span>
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
                      {usuario ? (
                        <>
                          <div className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-800">
                            <User size={16} /> {usuario.nombre || usuario.usuario || usuario.email}
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

              {usuario && (
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
                    <span className="absolute -right-1 -top-1 rounded-full text-[11px] font-bold bg-rose-600 text-white h-5 min-w-[20px] px-1.5 grid place-items-center ring-2 ring-white shadow">
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
            {menu.map((item, i) => (
              <motion.span
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-1 cursor-pointer px-3 py-1 transition-all ${
                  hovered === i
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

      {/* ===== Contenido ===== */}
      <section className="w-full max-w-6xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-[#a16207] mb-6">Mis pedidos</h1>

        {loading && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-3">
            <Loader2 className="animate-spin text-gray-700" /> Cargando tus pedidos…
          </div>
        )}

        {err && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm text-rose-700 flex items-center gap-2">
            <AlertCircle size={18} /> {err}
          </div>
        )}

        {emptyState && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-gray-700">No encontramos pedidos para tu cuenta.</p>
            <button
              onClick={() => navigate("/tienda")}
              className="mt-4 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
            >
              Ir a la tienda
            </button>
          </div>
        )}

        <div className="mt-4 space-y-6">
          {pedidos.map(({ order, items, shipment }) => {
            const thumbs = thumbsForCard(items);
            const fecha = new Date(order.created_at);
            const totalFmt = money(order.total, order.moneda || "MXN");
            const orderId = order.id;

            return (
              <div key={orderId} className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Stacked thumbs */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-[140px] h-[100px]">
                      {thumbs.slice(0, 4).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                          alt={`item ${i}`}
                          className="absolute top-1/2 left-1/2 w-[120px] h-[80px] object-cover rounded-lg shadow-md"
                          style={{
                            transform: `translate(-50%, -50%) rotate(${stackAngle(i)}deg)`,
                            zIndex: 10 - i,
                          }}
                        />
                      ))}
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">
                        Pedido <span className="font-semibold text-gray-900">{orderId}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {fecha.toLocaleDateString("es-MX", { dateStyle: "medium" })} · {items.length}{" "}
                        {items.length === 1 ? "artículo" : "artículos"}
                      </div>
                      <div className="text-base font-semibold text-gray-900 mt-1">{totalFmt}</div>

                      {shipment?.tracking_code && (
                        <div className="mt-1 text-xs text-gray-600 inline-flex items-center gap-2">
                          <Truck size={14} className="text-gray-500" />
                          <span className="font-medium">{shipment.carrier || "Paquetería"}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 border text-gray-800">
                            {shipment.tracking_code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        navigate(`/recibo?order=${encodeURIComponent(orderId)}`)
                      }
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      Ver comprobante <Receipt size={16} />
                    </button>

                    <button
                      onClick={() =>
                        navigate(
                          `/rastreo?order=${encodeURIComponent(orderId)}${
                            shipment?.tracking_code
                              ? `&tracking=${encodeURIComponent(shipment.tracking_code)}`
                              : ""
                          }`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
                    >
                      Rastrear pedido <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}