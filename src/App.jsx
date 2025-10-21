// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MarqueeProductos from "@/components/MarqueeProductos"; 
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

/* ======================= Helpers YouTube (para video en home) ======================= */
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return "";
  const v = String(urlOrId).trim();
  if (/^[\w-]{11}$/.test(v)) return v; // ID directo
  let m = v.match(/youtu\.be\/([\w-]{11})/i);
  if (m) return m[1];
  m = v.match(/[?&]v=([\w-]{11})/i);
  if (m) return m[1];
  m = v.match(/\/embed\/([\w-]{11})/i);
  if (m) return m[1];
  m = v.match(/\/shorts\/([\w-]{11})/i);
  if (m) return m[1];
  return "";
}
function embedUrl(id) {
  if (!id) return "";
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
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

  // Usuario/menú/carro
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  // ====== Publicaciones (3 productos) ======
  const [destacados, setDestacados] = useState([]);
  const [cargandoDest, setCargandoDest] = useState(true);

  useEffect(() => {
    const loadFeatured = async () => {
      setCargandoDest(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,titulo,descripcion,precio,moneda,imagenes,destacado,disponible")
          .is("disponible", true)
          .order("id", { ascending: false })
          .limit(3);

        if (error) throw error;
        const mapped = (data || []).map(rowToProductUI);
        setDestacados(mapped);
      } catch (e) {
        console.error("Error cargando publicaciones desde Supabase:", e);
        setDestacados([]);
      } finally {
        setCargandoDest(false);
      }
    };
    loadFeatured();
  }, []);

  // ====== Primer video publicado (para sección de videos en home) ======
  const [videoFirst, setVideoFirst] = useState(null); // { id, _vid, titulo, descripcion }
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [errorVideo, setErrorVideo] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingVideo(true);
      setErrorVideo("");
      try {
        const { data, error } = await supabase
          .from("videos")
          .select("id, video_id, url, titulo, descripcion, publicado, created_at")
          .eq("publicado", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;
        const first = (data && data[0]) || null;
        const _vid = first ? (first.video_id || extractYouTubeId(first.url)) : "";
        setVideoFirst(first && _vid ? { ...first, _vid } : null);
      } catch (e) {
        setErrorVideo(String(e.message || e));
        setVideoFirst(null);
      } finally {
        setLoadingVideo(false);
      }
    })();
  }, []);

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
    }, 5000);
  };

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
              <div className="h-20 sm:h-24 aspect-square overflow-hidden flex items-center justify-center">
                <img
                  src="/intro.gif"
                  alt="Logo animado"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/logo.png";
                  }}
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
      

      {/* Hero con video de fondo */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full relative overflow-hidden border-t border-gray-200"
        style={{ height: "400px" }}
      >
        <video
          src="/Pintura1.mov"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 z-10" />
        <div className="relative z-20 h-full flex flex-col justify-center items-center textcenter px-4">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white rounded-lg px-4 py-2">
            Bienvenido a la nueva experiencia visual
          </h2>
          <p className="text-lg text-white max-w-xl mx-auto px-6 py-3 rounded-lg leading-relaxed">
            Sumérgete en una galería donde cada trazo cuenta una historia. Todas las obras están hechas a mano, con alma, y ahora puedes llevarlas contigo.
          </p>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/tienda")}
            className="mt-8 px-6 py-3 bg-[#a16207] text-white border border-[#a16207] rounded-full shadow-lg hover:bg-[#854d06] hover:scale-105 transition-all duration-300"
          >
            Ver colección destacada
          </motion.button>
        </div>
      </motion.section>

      {/* Previsualización de productos con MagicUI Marquee */}
      <MarqueeProductos
        title="Explora más piezas"
        direction="horizontal"   // cambia a "vertical" si quieres el estilo de columnas
        reverseSecond={true}     // segundo riel en reversa para efecto “tejido”
        limit={14}               // cuántos productos traer desde Supabase
      />

      {/* Lo que ofrecemos */}
      <section className="w-full py-20 px-6 max-w-6xl mx-auto">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl font-extrabold text-center text-[#a16207] mb-12"
        >
          Lo que ofrecemos
        </motion.h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: "Tienda de obra original", d: "Pinturas y piezas únicas listas para envío." },
            { t: "Galería en línea", d: "Explora colecciones y series por temática." },
            { t: "Videos y procesos", d: "Recorridos y cápsulas sobre técnica y obra." },
            { t: "Restauración", d: "Diagnóstico y tratamiento profesional de obra pictórica." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-md p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <h4 className="text-lg font-semibold text-[#854d06] mb-1">{item.t}</h4>
              <p className="text-gray-700">{item.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Video (izquierda) + Texto (derecha) */}
      <section className="w-full px-6 pb-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Video a la izquierda */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white/60 backdrop-blur"
          >
            {loadingVideo ? (
              <div className="w-full h-[240px] grid place-items-center text-gray-600">
                Cargando video…
              </div>
            ) : errorVideo ? (
              <div className="w-full h-[240px] grid place-items-center text-rose-600">
                {errorVideo}
              </div>
            ) : videoFirst ? (
              <iframe
                key={videoFirst.id}
                src={embedUrl(videoFirst._vid)}
                title={videoFirst.titulo || videoFirst._vid}
                className="w-full h-[240px]"
                loading="lazy"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-[240px] grid place-items-center text-gray-600">
                No hay videos publicados aún.
              </div>
            )}
          </motion.div>

          {/* Texto a la derecha */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#a16207]">
              Desde nuestra sección de videos
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Un adelanto de los contenidos audiovisuales: procesos, recorridos y cápsulas
              sobre técnica y obra. Aquí mostramos el video más reciente publicado; en la página
              de videos encontrarás el archivo completo con navegación, miniaturas y descripciones extendidas.
            </p>
            <ul className="list-disc pl-6 text-gray-800 space-y-2">
              <li>Procesos paso a paso y materiales empleados.</li>
              <li>Recorridos por colecciones y montajes.</li>
              <li>Técnicas mixtas y experimentación visual.</li>
            </ul>
            <div className="pt-2">
              <button
                onClick={() => navigate("/videos")}
                className="px-5 py-2 rounded-full bg-[#a16207] text-white shadow hover:bg-[#854d06] transition"
              >
                Ver más videos
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Restauración */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-3xl shadow-xl -z-10" />

        <motion.h3
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl font-bold text-center text-[#a16207] mb-10"
        >
          Restauración
        </motion.h3>

        <div className="grid md:grid-cols-2 gap-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 border border-gray-200 rounded-2xl p-6 shadow-md"
          >
            <h4 className="text-xl font-semibold text-[#854d06] mb-2">Servicios</h4>
            <ul className="list-disc pl-5 space-y-2 text-gray-800">
              <li>Evaluación y diagnóstico del estado de la obra.</li>
              <li>Limpieza, estabilización y consolidación de materiales.</li>
              <li>Reintegración cromática y conservación preventiva.</li>
              <li>Asesoría para manejo, almacenamiento y exhibición.</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 border border-gray-200 rounded-2xl p-6 shadow-md"
          >
            <h4 className="text-xl font-semibold text-[#854d06] mb-2">Enfoque</h4>
            <p className="text-gray-800 leading-relaxed">
              Restauramos con criterios profesionales, priorizando la integridad de la obra y materiales compatibles.
              <br />
              <strong>Se auxilia de la investigación para la restauración de obra pictórica.</strong>
            </p>
            <button
              onClick={() => navigate("/restauracion")}
              className="mt-4 px-5 py-2 rounded-full bg-[#a16207] text-white shadow hover:bg-[#854d06] transition"
            >
              Realiza tu cotización
            </button>
          </motion.div>
        </div>
      </section>

      {/* Línea de vida artística (regresada, sin imagen de la artista) */}
      <section className="w-full py-20 px-6 max-w-6xl mx-auto">
        <h3 className="text-3xl sm:text-4xl font-bold text-center text-[#a16207] mb-16">
          Línea de vida artística
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 justify-items-center">
          {[
            {
              titulo: "Trayectoria profesional",
              eventos: [
                { año: "2005", evento: "“El caballete de la triste figura” – Galerías UAM." },
                { año: "2012", evento: "“Mujeres: nuestros cuerpos, nuestras vidas” – Galería Aguafuerte." },
                { año: "Anual", evento: "Exposiciones en el colectivo Esmeralda (Secretaría de Comunicaciones, Torre Pemex, Secretaría de Finanzas)." },
                { año: "2017–2018", evento: "Exposición individual – Galería Antiqus." },
                { año: "2024", evento: "Museo Barber Studio." },
              ],
            },
            {
              titulo: "Estudios",
              eventos: [
                { año: "2002–2005", evento: "Artes Plásticas, E.I.A No. 1 del INBA–CONACULTA." },
                { año: "2005–2010 / 2011–2013", evento: "Antropología y Guion Cinematográfico." },
                { año: "2007", evento: "Taller–Diplomado de Estética con el Dr. Moisés Ladrón de Guevara." },
                { año: "2007", evento: "Técnica de materiales con el Dr. Moisés Ladrón de Guevara." },
                { año: "2020–2022", evento: "Estudio de Restauración de 2020 a 2022." },
              ],
            },
            {
              titulo: "Premios y reconocimientos",
              eventos: [
                { año: "2006", evento: "Gandora del FONCA en arte objeto." },
                { año: "2005", evento: "Reconocimiento del Coloquio Internacional “El espejo simbolista”." },
                { año: "2008", evento: "Reconocimiento en el Simposio Internacional de Teoría sobre Arte." },
                { año: "2019", evento: "Reconocimiento en SITAC – Simposio Internacional de Teoría sobre Arte Contemporáneo." },
              ],
            },
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
                          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
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

      {/* Técnicas y materiales */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center text-[#a16207] mb-10">SOLUCIONES ESTÉTICAS PARA EMBELLECER TU ESPACIO</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-center">
          {["Venta de obras", "Restauración de obras", "Ambientación de negocios", "Reproducción de obras", "Fotografía digital temática", "Reproducción de pintura en técnica de óleo y acrílico"].map(
            (item, idx) => (
              <div key={idx} className="bg-white/70 p-6 rounded-xl shadow-md hover:shadow-lg transition">
                <p className="text-lg font-medium text-gray-800">{item}</p>
              </div>
            )
          )}
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