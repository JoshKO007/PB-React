// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  ShoppingBasket,
  Store,
} from "lucide-react";

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://ousgktyljynqzrnafoqd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE"
);

/* ======================= Helpers ======================= */
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

  // ====== Destacados (productos) ======
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
          .limit(3);

        if (error) throw error;
        const mapped = (data || []).map(rowToProductUI);
        setDestacados(mapped);
      } catch (e) {
        console.error("Error cargando destacados desde Supabase:", e);
        setDestacados([]);
      } finally {
        setCargandoDest(false);
      }
    };
    loadFeatured();
  }, []);

  // Slider (si hay destacados)
  useEffect(() => {
    if (!destacados.length) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % destacados.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [destacados.length]);

  // Cargar sesión
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

  // Escuchar cambios storage
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
        const prev = JSON.parse(localStorage.getItem("sesionActiva"));
        if (prev?.id) localStorage.removeItem(`carrito:${prev.id}`);
      } catch {}
      localStorage.removeItem("sesionActiva");
      setUsuarioActivo(null);
      setCartCount(0);
      setCerrandoSesion(false);
      navigate("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {/* Hero existente */}
      {/* ... tu header y hero se quedan igual ... */}

      {/* Productos destacados */}
      <section className="w-full py-16 border-t border-gray-200 bg-white/60">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-[#a16207] mb-8 flex items-center gap-2">
            <Store size={28} /> Publicaciones de la tienda
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cargandoDest ? (
              <p>Cargando...</p>
            ) : destacados.length === 0 ? (
              <p className="text-gray-600">No hay publicaciones disponibles.</p>
            ) : (
              destacados.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden"
                >
                  <img
                    src={p.imagenes[0] || "/placeholder.jpg"}
                    alt={p.titulo}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-4">
                    <h4 className="font-semibold text-lg">{p.titulo}</h4>
                    <p className="text-sm text-gray-600">{p.descripcion}</p>
                    <p className="mt-2 font-semibold text-[#a16207]">
                      ${p.precio} {p.moneda}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Restauración */}
      <section className="w-full py-20 border-t border-gray-200 bg-[#faf8f5]">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-[#a16207]"
          >
            Restauración de obra pictórica
          </motion.h3>
          <p className="text-lg text-gray-700 leading-relaxed">
            Recuperamos la esencia de cada obra con procesos profesionales:{" "}
            <strong>limpieza, consolidación, reintegración cromática y conservación preventiva</strong>.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Nos <strong>auxiliamos de la investigación</strong> para garantizar que cada pieza mantenga su valor histórico y artístico.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Cada restauración es única: cuidamos cada detalle para devolver a la obra su vida y esplendor.
          </p>
        </div>
      </section>

      {/* Manifiesto */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center text-[#a16207] mb-12">
          Manifiesto artístico
        </h3>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { titulo: "Investigación e integración", texto: "Integrar nuevas técnicas y manifestaciones artísticas como caminos creativos." },
            { titulo: "Diálogo con la historia", texto: "Cada cambio tecnológico genera posiciones encontradas, como ocurrió con los futuristas o la Bauhaus." },
            { titulo: "Búsqueda de belleza", texto: "La meta es alcanzar la belleza en un cuadro como experiencia estética plena." },
            { titulo: "Contra la inmediatez", texto: "El arte abre un espacio de contemplación, reflexión y calma frente a la prisa del mundo." },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.03 }}
              className="bg-white/70 rounded-xl shadow-md p-6 border hover:shadow-lg transition"
            >
              <h4 className="text-xl font-semibold text-[#854d06] mb-2">
                {item.titulo}
              </h4>
              <p className="text-gray-700">{item.texto}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Línea de vida */}
      <section className="w-full py-20 bg-white border-t border-gray-200">
        <h3 className="text-3xl font-bold text-center text-[#a16207] mb-16">
          Línea de vida artística
        </h3>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          {[
            {
              titulo: "Trayectoria profesional",
              eventos: [
                { año: "2005", evento: "Exposición en Galerías UAM" },
                { año: "2012", evento: "“Mujeres: nuestros cuerpos, nuestras vidas” – Galería Aguafuerte." },
                { año: "2017–2018", evento: "Exposición individual – Galería Antiqus." },
                { año: "2024", evento: "Museo Barber Studio." },
              ],
            },
            {
              titulo: "Estudios",
              eventos: [
                { año: "2002–2005", evento: "Artes Plásticas, INBA–CONACULTA." },
                { año: "2005–2010", evento: "Antropología y Guion Cinematográfico." },
                { año: "2007", evento: "Taller de Estética con Moisés Ladrón de Guevara." },
                { año: "2020–2022", evento: "Estudio independiente de Restauración." },
              ],
            },
          ].map((seccion, i) => (
            <div key={i}>
              <h4 className="text-2xl font-semibold text-[#854d06] mb-6">
                {seccion.titulo}
              </h4>
              <div className="space-y-6 border-l-4 border-[#a16207] pl-6">
                {seccion.eventos.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="absolute -left-7 top-2 w-4 h-4 bg-[#a16207] rounded-full shadow" />
                    <p className="text-lg text-gray-800">
                      <strong>{item.año}:</strong> {item.evento}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}