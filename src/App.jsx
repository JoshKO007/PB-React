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
  Heart as HeartIcon,
  ShoppingBasket,
  Store,
  PlayCircle,
  Sparkles,
} from "lucide-react";

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
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
    imagenes: Array.isArray(r.imagenes) ? r.imagenes.map(buildImgUrl) : [],
  };
}

/* ======================= Helpers carrito por usuario ======================= */
function getCartKeyBySession(s) {
  return s?.id ? `carrito:${s.id}` : null;
}
function safeCartCount(cartArray) {
  return (cartArray || []).reduce((sum, it) => {
    const qty = Number.isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 1;
    return sum + Math.max(0, qty);
  }, 0);
}

/* ======================= Página ======================= */
export default function App() {
  const [hovered, setHovered] = useState(null);

  // Usuario/menú/carro
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  // ====== Productos destacados (máx 3) ======
  const [destacados, setDestacados] = useState([]);
  const [cargandoDest, setCargandoDest] = useState(true);

  // ====== Videos (desde BD, muestran link) ======
  const [videos, setVideos] = useState([]);
  const [cargandoVideos, setCargandoVideos] = useState(true);

  useEffect(() => {
    const loadFeatured = async () => {
      setCargandoDest(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,titulo,descripcion,precio,moneda,imagenes,destacado,disponible")
          .eq("destacado", true)
          .is("disponible", true)
          .order("id", { ascending: true })
          .limit(3);

        if (error) throw error;
        setDestacados((data || []).map(rowToProductUI));
      } catch (e) {
        console.error("Error cargando destacados:", e);
        setDestacados([]);
      } finally {
        setCargandoDest(false);
      }
    };

    const loadVideos = async () => {
      setCargandoVideos(true);
      try {
        const { data, error } = await supabase
          .from("videos")
          .select("id, titulo, descripcion, url")
          .order("id", { ascending: false })
          .limit(1); // si quieres más, sube el limit

        if (error) throw error;
        setVideos(data || []);
      } catch (e) {
        console.error("Error cargando videos:", e);
        setVideos([]);
      } finally {
        setCargandoVideos(false);
      }
    };

    loadFeatured();
    loadVideos();
  }, []);

  // ====== Sesión ======
  useEffect(() => {
    try {
      const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
      setUsuarioActivo(sesion?.id ? sesion : null);
      if (sesion?.id) {
        const key = getCartKeyBySession(sesion);
        const cart = JSON.parse(localStorage.getItem(key)) || [];
        setCartCount(safeCartCount(cart));
      }
    } catch {
      setUsuarioActivo(null);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "sesionActiva") {
        try {
          const sesion = JSON.parse(e.newValue || "null");
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

  useEffect(() => {
    const onFocus = () => {
      try {
        const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
        setUsuarioActivo(sesion?.id ? sesion : null);
        if (sesion?.id) {
          const key = getCartKeyBySession(sesion);
          const cart = JSON.parse(localStorage.getItem(key)) || [];
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
  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("carrito");
        const prev = JSON.parse(localStorage.getItem("sesionActiva") || "null");
        if (prev?.id) localStorage.removeItem(`carrito:${prev.id}`);
      } catch {}
      localStorage.removeItem("sesionActiva");
      setUsuarioActivo(null);
      setCartCount(0);
      setCerrandoSesion(false);
      navigate("/");
    }, 1200);
  };

  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate("/") },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate("/galeria") },
    { label: "Videos", icon: <VideoIcon size={24} />, onClick: () => navigate("/videos") },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate("/tienda") },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate("/restauracion") },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate("/contacto") },
  ];

  /* ======================= UI ======================= */
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
              {/* Logo animado cuadrado */}
              <div className="h-20 sm:h-24 aspect-square overflow-hidden flex items-center justify-center rounded-xl ring-1 ring-gray-300 bg-white/60">
                <img
                  src="/intro.gif"
                  alt="Logo"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.src = "/logo.png"; }}
                />
              </div>
              <div className="flex gap-2 sm:gap-6 text-lg sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
                <span>ARTE</span><span>RESTAURACIÓN</span><span>VISUALES</span>
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

          {/* Firma */}
          <div className="text-sm italic text-gray-600 pt-1 text-right pr-1">por: Laura García</div>

          {/* Menú */}
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

      {/* HERO moderno (sin video ni foto): gradiente y copy */}
      <section className="w-full relative overflow-hidden border-t border-gray-200">
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight"
          >
            Arte hecho a mano, con alma
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto"
          >
            Obras originales, restauración profesional y publicaciones seleccionadas. Explora, colecciona y acompaña el proceso creativo.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate("/tienda")}
              className="px-6 py-3 bg-[#a16207] text-white rounded-full font-semibold hover:bg-[#854d06] shadow-md"
            >
              Ver tienda
            </button>
            <button
              onClick={() => navigate("/videos")}
              className="px-6 py-3 bg-white border rounded-full font-semibold hover:bg-gray-50 shadow"
            >
              Ver videos
            </button>
          </motion.div>
        </div>

        {/* Fondo animado suave */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,220,150,0.45),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(173,216,230,0.45),transparent_55%)]" />
      </section>

      {/* Publicaciones de la tienda (máx 3) */}
      <section className="w-full py-12 border-t border-gray-300 bg-white/60">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-[#a16207] mb-6 flex items-center gap-2">
            <Store size={22} /> Publicaciones de la tienda
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cargandoDest ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-60 rounded-2xl border bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 animate-pulse" />
              ))
            ) : destacados.length === 0 ? (
              <div className="text-gray-600">No hay publicaciones destacadas aún.</div>
            ) : (
              destacados.map((p) => (
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
                    <h4 className="font-semibold line-clamp-2">{p.titulo}</h4>
                    <p className="text-sm text-gray-700 line-clamp-2">{p.descripcion}</p>
                    <div className="mt-2 font-semibold text-[#a16207]">
                      ${p.precio} {p.moneda}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => navigate(`/producto/${p.id}`)}
                        className="px-3 py-1.5 rounded-full text-sm border hover:bg-gray-50"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={() => navigate("/tienda")}
                        className="px-3 py-1.5 rounded-full text-sm bg-[#a16207] text-white hover:bg-[#854d06]"
                      >
                        Ver tienda
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Video destacado (desde BD, se abre el link) */}
      <section className="w-full py-14">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-[#a16207] mb-6 flex items-center gap-2">
            <PlayCircle size={22} /> Video destacado
          </h3>

          {cargandoVideos ? (
            <div className="h-40 rounded-2xl border bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 animate-pulse" />
          ) : videos.length === 0 ? (
            <p className="text-gray-600">No hay videos disponibles.</p>
          ) : (
            videos.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 border rounded-2xl bg-white shadow-sm"
              >
                <h4 className="font-semibold">{v.titulo || "Video"}</h4>
                {v.descripcion && <p className="text-sm text-gray-700 mt-1">{v.descripcion}</p>}
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                  Abrir video <PlayCircle size={16} />
                </a>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Restauración (texto + botones, moderno) */}
      <section className="w-full py-16 border-t border-gray-300 bg-white/70">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2 text-[#a16207] mb-2">
            <Brush size={22} />
            <h3 className="text-3xl font-bold">Restauración de obra</h3>
          </div>
          <p className="text-lg text-gray-800 leading-relaxed">
            Atención a obra pictórica con enfoque profesional: diagnóstico, limpieza,
            consolidación y reintegración cromática cuando procede.
          </p>
          <p className="mt-3 text-gray-700">
            <strong>Se auxilia de la investigación para la restauración de obra pictórica.</strong>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/restauracion")}
              className="px-5 py-2 rounded-full bg-[#a16207] text-white font-semibold hover:bg-[#854d06]"
            >
              Conoce el servicio
            </button>
            <button
              onClick={() => navigate("/contacto")}
              className="px-5 py-2 rounded-full border font-semibold hover:bg-gray-50"
            >
              Solicitar valoración
            </button>
          </div>
        </div>
      </section>

      {/* Línea de vida artística (al final) */}
      <section className="w-full py-20 px-6 max-w-6xl mx-auto">
        <motion.h3
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-center text-[#a16207] mb-12"
        >
          Línea de vida artística
        </motion.h3>

        <div className="grid md:grid-cols-2 gap-20 justify-items-center">
          {[
            {
              titulo: "Trayectoria profesional",
              eventos: [
                { año: "2005", evento: "“El caballete de la triste figura” – Galerías UAM." },
                { año: "2012", evento: "“Mujeres: nuestros cuerpos, nuestras vidas” – Galería Aguafuerte." },
                { año: "Anual", evento: "Exposiciones en el colectivo Esmeralda (Secretaría de Comunicaciones, Torre Pemex, Secretaría de Finanzas)." },
                { año: "2017–2018", evento: "Exposición individual – Galería Antiqus." },
                { año: "2024", evento: "Museo Barber Studio." }
              ]
            },
            {
              titulo: "Estudios",
              eventos: [
                { año: "2002–2005", evento: "Artes Plásticas, E.I.A No. 1 del INBA–CONACULTA." },
                { año: "2005–2010 / 2011–2013", evento: "Antropología y Guion Cinematográfico." },
                { año: "2007", evento: "Taller–Diplomado de Estética con el Dr. Moisés Ladrón de Guevara." },
                { año: "2007", evento: "Técnica de materiales con el Dr. Moisés Ladrón de Guevara." },
                { año: "2020–2022", evento: "Estudio independiente de Restauración." }
              ]
            },
            {
              titulo: "Premios y reconocimientos",
              eventos: [
                { año: "2010", evento: "Premio de Investigación CONACYT – Excelencia en investigación académica." },
                { año: "s/f", evento: "Reconocimiento del Coloquio Internacional “El espejo simbolista”." },
                { año: "s/f", evento: "Reconocimiento en el Simposio Internacional de Teoría sobre Arte." },
                { año: "s/f", evento: "Reconocimiento en SITAC – Simposio Internacional de Teoría sobre Arte Contemporáneo." }
              ]
            }
          ].map((seccion, i) => {
            const isLastSingle = i === 2 && 3 % 2 !== 0;
            return (
              <div key={i} className={isLastSingle ? "md:col-span-2 flex justify-center" : ""}>
                <div className="space-y-6 w-full max-w-xl">
                  <h4 className="text-2xl font-semibold text-[#854d06]">{seccion.titulo}</h4>
                  <div className="relative border-l-4 border-[#a16207] pl-8 space-y-8">
                    {seccion.eventos.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        whileHover={{
                          scale: 1.03,
                          backgroundColor: "rgba(255,255,255,0.7)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.1)"
                        }}
                        transition={{ duration: 0.3 }}
                        viewport={{ once: true }}
                        className="relative p-4 rounded-lg cursor-pointer"
                      >
                        <div className="absolute -left-5 top-4 w-4 h-4 rounded-full bg-[#a16207] shadow-md"></div>
                        <p className="text-lg text-gray-800">
                          <strong>{item.año}:</strong> {item.evento}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manifiesto artístico (al final) */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-3xl shadow-xl -z-10" />

        <motion.h3
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-center text-[#a16207] mb-12"
        >
          Manifiesto artístico
        </motion.h3>

        <div className="grid md:grid-cols-2 gap-12">
          {[
            {
              titulo: "Investigación e integración",
              texto:
                "A favor de la investigación y la integración de nuevas técnicas y manifestaciones artísticas como caminos creativos."
            },
            {
              titulo: "Diálogo con los manifiestos",
              texto:
                "Cada cambio tecnológico genera posiciones encontradas, como ocurrió con los futuristas, surrealistas, Black Mountain o la Bauhaus."
            },
            {
              titulo: "Búsqueda de belleza",
              texto:
                "La meta es alcanzar la belleza en un cuadro: que la técnica o el material conduzcan a una experiencia estética plena."
            },
            {
              titulo: "Contra la inmediatez catastrófica",
              texto:
                "Frente a la oleada de mensajes catastróficos, el arte abre un espacio de contemplación, reflexión y calma."
            },
            {
              titulo: "Aspiración al público",
              texto:
                "Crear objetos que den respiro de tranquilidad al espacio y a quien los mira: paisajes, objetos o personas que invitan a contemplar."
            },
            {
              titulo: "Herramientas de su tiempo",
              texto:
                "Un artista debe ser capaz de tomar las herramientas de su tiempo para expandir sus posibilidades creativas."
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              viewport={{ once: true }}
              className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-2 text-[#a16207] mb-2">
                <Sparkles size={18} />
                <h4 className="text-xl font-semibold text-[#854d06]">{item.titulo}</h4>
              </div>
              <p className="text-gray-800 text-base leading-relaxed">{item.texto}</p>
            </motion.div>
          ))}
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