// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Image as ImageIcon,
  Video as VideoIcon,
  ShoppingBag,
  Brush,
  User,
  Mail,
  LogIn,
  UserPlus,
  LogOut,
  KeyRound,
  HeartIcon,
  ShoppingBasket,
  Truck,
  Sparkles,
  Store,
  PlayCircle
} from "lucide-react";

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://ousgktyljynqzrnafoqd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE"
);

/* ======================= Helpers imágenes ======================= */
function buildImgUrl(pathLike) {
  if (!pathLike) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(pathLike)) return pathLike;
  if (/^\//.test(pathLike)) return pathLike;
  return `/${String(pathLike).replace(/^public\//, "")}`;
}

function rowToProductUI(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    precio: Number(r.precio),
    moneda: r.moneda || "MXN",
    destacado: !!r.destacado,
    imagenes: Array.isArray(r.imagenes) ? r.imagenes.map(buildImgUrl) : [],
  };
}

/* ======================= Helpers carrito por usuario ======================= */
function getCartKeyBySession(sesion) {
  return sesion?.id ? `carrito:${sesion.id}` : null;
}
function safeCartCount(cartArray) {
  return (cartArray || []).reduce((sum, it) => {
    const qty = Number.isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 1;
    return sum + Math.max(0, qty);
  }, 0);
}

export default function App() {
  const [hovered, setHovered] = useState(null);
  const [index, setIndex] = useState(0);

  // Usuario/menú/carro
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  // ====== Destacados (solo Supabase) ======
  const [destacados, setDestacados] = useState([]);
  const [cargandoDest, setCargandoDest] = useState(true);

  useEffect(() => {
    const loadFeatured = async () => {
      setCargandoDest(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,titulo,descripcion,precio,moneda,imagenes,destacado")
          .eq("destacado", true)
          .is("disponible", true)
          .order("id", { ascending: true });

        if (error) throw error;
        const mapped = (data || []).map(rowToProductUI);
        setDestacados(mapped);
      } catch (e) {
        console.error("Error cargando destacados desde Supabase:", e);
        setDestacados([]); // sin fallback local
      } finally {
        setCargandoDest(false);
      }
    };
    loadFeatured();
  }, []);

  // Slider (solo corre si hay destacados)
  useEffect(() => {
    if (!destacados.length) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % destacados.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [destacados.length]);

  // Cargar sesión al montar
  useEffect(() => {
    try {
      const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
      if (sesion?.id && sesion.id !== usuarioActivo?.id) {
        setUsuarioActivo(sesion);
      }
    } catch {
      setUsuarioActivo(null);
    }
  }, []);

  // Recalcular contador cuando cambia la sesión
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

  // Escuchar cambios en localStorage (sesión y carrito del usuario actual)
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

  // Al volver el foco, re-sincronizar sesión y contador
  useEffect(() => {
    const onFocus = () => {
      try {
        const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
        setUsuarioActivo(sesion?.id ? sesion : null);
        if (sesion?.id) {
          const key = getCartKeyBySession(sesion);
          const cart = JSON.parse(localStorage.getItem(key) || "[]");
          setCartCount(safeCartCount(cart));
        } else {
          setCartCount(0);
        }
      } catch {
        setUsuarioActivo(null);
        setCartCount(0);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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
    { label: "Videos", icon: <VideoIcon size={24} />, onClick: () => navigate("/videos") },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate("/tienda") },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate("/restauracion") },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate("/contacto") },
  ];

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
      setCartCount(0);
      setCerrandoSesion(false);
      navigate("/");
    }, 1200);
  };

  const destacadoActual = destacados[index] || null;
  const imgActual =
    destacadoActual?.imagenes?.[0] ??
    buildImgUrl(destacadoActual?.imagen) ??
    "/placeholder.jpg";

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">
          <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              {/* Logo animado */}
              <div className="h-20 sm:h-24 aspect-square overflow-hidden flex items-center justify-center rounded-xl shadow-sm ring-1 ring-gray-300/50 bg-white">
                <img
                  src="/intro.gif"
                  alt="Logo animado"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.src = "/logo.png"; }}
                />
              </div>
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
                          <button onClick={() => navigate("/mis-pedidos")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <ShoppingBasket size={16} className="mr-2" /> Mis pedidos
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
            {menu.map((item, i) => (
              <motion.span
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-1 cursor-pointer px-2 sm:px-3 py-1 transition-all duration-300 ease-out
                  ${hovered === i
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

      {/* Hero con video */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full relative overflow-hidden border-t border-gray-200 rounded-b-3xl"
        style={{ height: "420px" }}
      >
        <video
          src="/Pintura1.mov"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 z-10" />
        <div className="relative z-20 h-full flex flex-col justify-center items-center px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-white tracking-tight"
          >
            Arte contemporáneo, tienda y restauración
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg text-white/90 max-w-2xl mt-4"
          >
            Explora la galería, adquiere piezas originales, mira videos y solicita restauración profesional.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-3 justify-center"
          >
            <button
              onClick={() => navigate("/tienda")}
              className="px-6 py-3 bg-white text-gray-900 rounded-full shadow hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              Ver tienda
            </button>
            <button
              onClick={() => navigate("/restauracion")}
              className="px-6 py-3 bg-[#a16207] text-white rounded-full shadow hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              Restauración
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* Qué ofrecemos */}
      <section className="w-full py-14">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h3
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-center text-[#a16207] mb-8"
          >
            ¿Qué ofrece esta página?
          </motion.h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Store />, title: "Tienda en línea", desc: "Compra obras originales y series seleccionadas." },
              { icon: <ImageIcon />, title: "Galería", desc: "Explora colecciones con fotografías de alta calidad." },
              { icon: <VideoIcon />, title: "Videos", desc: "Contenido audiovisual y procesos de creación." },
              { icon: <Brush />, title: "Restauración", desc: "Atención de obra pictórica con criterios profesionales." },
              { icon: <Truck />, title: "Envío con rastreo", desc: "Seguimiento de tus pedidos desde el panel de usuario." },
              { icon: <Sparkles />, title: "Ediciones especiales", desc: "Piezas destacadas y lanzamientos limitados." },
            ].map((c, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4, scale: 1.01 }}
                className="rounded-2xl bg-white border shadow-sm p-5 flex items-start gap-3"
              >
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-amber-100 text-amber-700">
                  {c.icon}
                </div>
                <div>
                  <h4 className="font-semibold">{c.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Publicaciones / destacados de la tienda */}
      <section className="w-full py-10 border-t border-gray-300 bg-white/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h3 className="text-2xl font-bold text-[#a16207] flex items-center gap-2">
              <Store size={22}/> Publicaciones de la tienda
            </h3>
            <button
              onClick={() => navigate("/tienda")}
              className="text-sm rounded-full border px-3 py-1.5 hover:bg-gray-50"
            >
              Ver más
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cargandoDest ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border p-4 bg-gray-50 animate-pulse h-72" />
              ))
            ) : destacados.length === 0 ? (
              <div className="col-span-full rounded-2xl border bg-gray-50 p-6 text-gray-600">
                No hay obras destacadas disponibles por ahora.
              </div>
            ) : (
              destacados.slice(0, 6).map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border bg-white shadow-sm overflow-hidden"
                >
                  <img
                    src={p.imagenes[0] || "/placeholder.jpg"}
                    alt={p.titulo}
                    className="h-44 w-full object-cover"
                    onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                  />
                  <div className="p-4">
                    <h4 className="font-semibold truncate">{p.titulo}</h4>
                    <p className="text-sm text-gray-700 line-clamp-2 mt-1">{p.descripcion}</p>
                    {Number.isFinite(p.precio) && (
                      <div className="mt-2 font-semibold text-[#a16207]">
                        ${p.precio} {p.moneda}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => navigate("/tienda")}
                        className="text-sm rounded-full bg-gray-900 text-white px-3 py-1.5 hover:shadow"
                      >
                        Comprar
                      </button>
                      <button
                        onClick={() => navigate("/galeria")}
                        className="text-sm rounded-full border px-3 py-1.5 hover:bg-gray-50"
                      >
                        Ver galería
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Video destacado (sección aparte) */}
      <section className="w-full py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-2xl font-bold text-[#a16207] flex items-center gap-2">
              <PlayCircle size={22}/> Video destacado
            </h3>
            <button
              onClick={() => navigate("/videos")}
              className="text-sm rounded-full border px-3 py-1.5 hover:bg-gray-50"
            >
              Ver todos
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="aspect-video w-full rounded-2xl overflow-hidden border shadow-sm bg-black"
          >
            <video
              src="/videos/video1.mp4"
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Restauración */}
      <section className="w-full py-16 border-t border-gray-300 bg-white/70">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 md:order-1"
          >
            <h3 className="text-3xl font-bold text-[#a16207] mb-3">Restauración de obra</h3>
            <p className="text-lg text-gray-800 leading-relaxed">
              Atención a obra pictórica con enfoque profesional: diagnósticos, limpieza,
              consolidación y reintegración cromática cuando procede.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Se auxilia de la investigación para la restauración de obra pictórica.</strong>
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => navigate("/restauracion")}
                className="px-5 py-2.5 rounded-full bg-gray-900 text-white hover:shadow"
              >
                Conocer más
              </button>
              <button
                onClick={() => navigate("/contacto")}
                className="px-5 py-2.5 rounded-full border hover:bg-gray-50"
              >
                Solicitar valoración
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-1 md:order-2"
          >
            {/* Visual moderno sin foto de persona */}
            <div className="relative h-72 rounded-3xl overflow-hidden border shadow-lg bg-gradient-to-br from-amber-200 via-white to-amber-100">
              <div className="absolute inset-0 opacity-40 mix-blend-multiply">
                <svg viewBox="0 0 600 600" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fde68a" />
                    </linearGradient>
                  </defs>
                  <circle cx="120" cy="120" r="110" fill="url(#g1)" />
                  <circle cx="500" cy="120" r="70" fill="#fcd34d" />
                  <circle cx="420" cy="380" r="140" fill="#fbbf24" />
                </svg>
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <div className="px-6 py-3 bg-white/80 backdrop-blur rounded-full border text-sm font-medium flex items-center gap-2">
                  <Brush className="text-[#a16207]" size={18}/> Restauración profesional
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}