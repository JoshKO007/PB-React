// src/App.jsx
import { useState, useEffect } from "react";
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
} from "lucide-react";

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

export default function App() {
  const [destacados, setDestacados] = useState([]);
  const [cargandoDest, setCargandoDest] = useState(true);
  const [videos, setVideos] = useState([]);
  const [cargandoVideos, setCargandoVideos] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFeatured = async () => {
      setCargandoDest(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,titulo,descripcion,precio,moneda,imagenes,destacado,disponible")
          .eq("destacado", true)
          .is("disponible", true)
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
          .limit(1);

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

  /* ======================= UI ======================= */
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
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
          </div>
        </div>
      </motion.header>

      {/* HERO con video de fondo */}
      <section className="w-full relative overflow-hidden border-t border-gray-200" style={{ height: "450px" }}>
        <video
          src="/Pintura1.mov"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="relative z-20 h-full flex flex-col justify-center items-center px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white drop-shadow-lg">
            Bienvenido a la nueva experiencia visual
          </h2>
          <p className="text-lg text-white max-w-xl mx-auto leading-relaxed drop-shadow">
            Sumérgete en una galería donde cada trazo cuenta una historia. Obras hechas a mano, restauración profesional y publicaciones únicas.
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
      </section>

      {/* Publicaciones de la tienda */}
      <section className="w-full py-12 border-t border-gray-300 bg-white/60">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-[#a16207] mb-6 flex items-center gap-2">
            <Store size={22} /> Publicaciones de la tienda
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cargandoDest ? (
              <div>Cargando...</div>
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
                  />
                  <div className="p-4">
                    <h4 className="font-semibold">{p.titulo}</h4>
                    <p className="text-sm text-gray-700">{p.descripcion}</p>
                    <div className="mt-2 font-semibold text-[#a16207]">
                      ${p.precio} {p.moneda}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Video destacado */}
      <section className="w-full py-14">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-[#a16207] mb-6 flex items-center gap-2">
            <PlayCircle size={22} /> Video destacado
          </h3>
          {cargandoVideos ? (
            <p>Cargando video...</p>
          ) : videos.length === 0 ? (
            <p className="text-gray-600">No hay videos disponibles.</p>
          ) : (
            videos.map((v) => (
              <div key={v.id} className="space-y-3">
                <h4 className="font-semibold">{v.titulo}</h4>
                <p className="text-sm text-gray-700">{v.descripcion}</p>
                <div className="aspect-video w-full rounded-xl overflow-hidden border shadow">
                  <iframe
                    src={v.url}
                    title={v.titulo}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Restauración */}
      <section className="w-full py-16 border-t border-gray-300 bg-white/70">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2 text-[#a16207] mb-2">
            <Brush size={22} />
            <h3 className="text-3xl font-bold">Restauración de obra</h3>
          </div>
          <p className="text-lg text-gray-800 leading-relaxed">
            Nos especializamos en la restauración de obra pictórica, ofreciendo diagnósticos precisos, limpieza profunda, consolidación estructural y reintegración cromática.
          </p>
          <p className="mt-3 text-gray-700">
            <strong>Se auxilia de la investigación</strong> para garantizar que cada intervención respete la técnica original y la integridad histórica de la pieza.
          </p>
          <p className="mt-3 text-gray-700">
            Cada proyecto es único: trabajamos con materiales tradicionales y modernos para devolver vida y valor cultural a la obra.
          </p>
        </div>
      </section>

      {/* Manifiesto artístico */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <motion.h3
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-center text-[#a16207] mb-12"
        >
          Manifiesto artístico
        </motion.h3>
        <div className="grid md:grid-cols-2 gap-12">
          {[
            { titulo: "Investigación e integración", texto: "A favor de la investigación y la integración de nuevas técnicas y manifestaciones artísticas como caminos creativos." },
            { titulo: "Diálogo con los manifiestos", texto: "Cada cambio tecnológico genera posiciones encontradas, como ocurrió con los futuristas, surrealistas, Black Mountain o la Bauhaus." },
            { titulo: "Búsqueda de belleza", texto: "La meta es alcanzar la belleza en un cuadro: que la técnica o el material conduzcan a una experiencia estética plena." },
            { titulo: "Contra la inmediatez catastrófica", texto: "Frente a la oleada de mensajes catastróficos, el arte abre un espacio de contemplación, reflexión y calma." },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
            >
              <h4 className="text-xl font-semibold text-[#854d06] mb-2">{item.titulo}</h4>
              <p className="text-gray-800 text-base leading-relaxed">{item.texto}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Línea de vida artística */}
      <section className="w-full py-20 px-6 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center text-[#a16207] mb-20">Línea de vida artística</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 justify-items-center">
          {[
            {
              titulo: "Trayectoria profesional",
              eventos: [
                { año: "2005", evento: "“El caballete de la triste figura” – Galerías UAM." },
                { año: "2012", evento: "“Mujeres: nuestros cuerpos, nuestras vidas” – Galería Aguafuerte." },
                { año: "Anual", evento: "Exposiciones en el colectivo Esmeralda." },
                { año: "2017–2018", evento: "Exposición individual – Galería Antiqus." },
                { año: "2024", evento: "Museo Barber Studio." },
              ],
            },
            {
              titulo: "Estudios",
              eventos: [
                { año: "2002–2005", evento: "Artes Plásticas, INBA–CONACULTA." },
                { año: "2005–2010", evento: "Antropología y Guion Cinematográfico." },
                { año: "2007", evento: "Taller–Diplomado de Estética con Moisés Ladrón de Guevara." },
                { año: "2020–2022", evento: "Estudio independiente de Restauración." },
              ],
            },
          ].map((seccion, i) => (
            <div key={i} className="space-y-6 w-full max-w-xl">
              <h4 className="text-2xl font-semibold text-[#854d06]">{seccion.titulo}</h4>
              <div className="relative border-l-4 border-[#a16207] pl-8 space-y-8">
                {seccion.eventos.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    viewport={{ once: true }}
                    className="relative p-4 rounded-lg cursor-pointer hover:bg-white/50"
                  >
                    <div className="absolute -left-5 top-4 w-4 h-4 rounded-full bg-[#a16207] shadow-md"></div>
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

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}