// src/pages/Galeria.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FondoParticulas from "../components/FondoParticulas";
import { Volume2, VolumeX, LogOut, Music, Music2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ousgktyljynqzrnafoqd.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============ Helpers ============ */
function parseImagenes(v) {
  try {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return String(v).split(",").map(s => s.trim()).filter(Boolean);
  }
}

function normalizeImg(pathLike) {
  if (!pathLike) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(pathLike)) return pathLike;
  let cleaned = String(pathLike).replace(/^public\//, "");
  if (!/^obras\//.test(cleaned)) cleaned = `obras/${cleaned}`;
  return `/${cleaned}`;
}

export default function Galeria() {
  const [index, setIndex] = useState(0);

  // Datos desde BD
  const [obras, setObras] = useState([]); // [{titulo, descripcion, imagen}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI/FX
  const [mostrarTutorial, setMostrarTutorial] = useState(true);
  const [narradorActivo, setNarradorActivo] = useState(false);
  const [musicaActiva, setMusicaActiva] = useState(true);
  const [mostrarDialogo, setMostrarDialogo] = useState(true);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Carga de productos (solo los visibles en galería)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id, titulo, descripcion, imagenes, visible_galeria")
          .eq("visible_galeria", true)
          .order("id", { ascending: true });

        if (error) throw error;

        const mapped = (data || []).map(r => {
          const imgs = parseImagenes(r.imagenes);
          const first = imgs[0] || "";
          return {
            titulo: r.titulo || "Sin título",
            descripcion: r.descripcion || "",
            imagen: normalizeImg(first),
          };
        });

        setObras(mapped);
        setIndex(0);
      } catch (e) {
        setError("No se pudieron cargar las obras.");
        setObras([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const siguiente = () => {
    if (obras.length === 0) return;
    setIndex((prev) => (prev + 1) % obras.length);
    setMostrarTutorial(false);
  };

  const anterior = () => {
    if (obras.length === 0) return;
    setIndex((prev) => (prev - 1 + obras.length) % obras.length);
    setMostrarTutorial(false);
  };

  const transicion = { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] };

  const narrarObra = (obra) => {
    if (!narradorActivo || !obra) return;
    window.speechSynthesis.cancel();
    const texto = `${obra.titulo}. ${obra.descripcion}`;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-MX';
    const voces = window.speechSynthesis.getVoices();
    const vozNatural = voces.find(v => v.lang === 'es-MX' && v.name.toLowerCase().includes('paulina'));
    if (vozNatural) utterance.voice = vozNatural;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!obras || obras.length === 0) return;
    const timeout = setTimeout(() => {
      if (narradorActivo) narrarObra(obras[index]);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [index, narradorActivo, obras]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') siguiente();
      if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [obras]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicaActiva && !narradorActivo) {
      audio.volume = 0.1;
      audio.play().catch(() => {});
    } else {
      let fade = setInterval(() => {
        if (audio.volume > 0.01) {
          audio.volume -= 0.01;
        } else {
          audio.pause();
          clearInterval(fade);
        }
      }, 50);
    }
  }, [musicaActiva, narradorActivo]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const obraActual = obras[index];

  return (
    <div className="relative min-h-screen bg-[#0d0d0d] text-white overflow-hidden" ref={containerRef}>
      <FondoParticulas />
      <audio ref={audioRef} src="/audio/fondo.mp3" loop />

      {/* Diálogo narrador */}
      <AnimatePresence>
        {mostrarDialogo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-white text-black p-6 rounded-xl shadow-lg w-[90%] max-w-sm text-center space-y-4">
              <h2 className="text-lg font-bold">¿Deseas activar el narrador de voz?</h2>
              <div className="flex justify-center gap-6 mt-4">
                <button
                  onClick={() => { setNarradorActivo(true); setMostrarDialogo(false); }}
                  className="bg-[#a16207] text-white px-4 py-2 rounded-md hover:bg-[#854d06]"
                >
                  Sí
                </button>
                <button
                  onClick={() => setMostrarDialogo(false)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  No
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Salida */}
      <button
        onClick={() => {
          window.speechSynthesis.cancel();
          if (audioRef.current) audioRef.current.pause();
          navigate('/');
        }}
        className="fixed top-6 left-6 z-50 bg-white/10 border border-white/20 text-white p-3 rounded-full backdrop-blur hover:scale-105 transition"
        title="Salir al menú"
      >
        <LogOut size={22} />
      </button>

      {/* Botones verticales */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        <div className="group flex flex-row-reverse items-center gap-2">
          <button
            onClick={() => { window.speechSynthesis.cancel(); setNarradorActivo(prev => !prev); }}
            className="bg-white/10 border border-white/20 text-white p-3 rounded-full backdrop-blur hover:scale-110 transition"
          >
            {narradorActivo ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <span className="opacity-0 group-hover:opacity-100 transition text-sm text-white whitespace-nowrap">
            {narradorActivo ? "Desactivar narrador" : "Activar narrador"}
          </span>
        </div>

        <div className="group flex flex-row-reverse items-center gap-2">
          <button
            onClick={() => setMusicaActiva(prev => !prev)}
            className="bg-white/10 border border-white/20 text-white p-3 rounded-full backdrop-blur hover:scale-110 transition"
          >
            {musicaActiva ? <Music size={22} /> : <Music2 size={22} />}
          </button>
          <span className="opacity-0 group-hover:opacity-100 transition text-sm text-white whitespace-nowrap">
            {musicaActiva ? "Silenciar música" : "Activar música"}
          </span>
        </div>
      </div>

      {/* Tutorial */}
      <AnimatePresence>
        {mostrarTutorial && obras.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 w-full flex justify-center items-center z-40 pointer-events-none"
          >
            <div className="hidden md:flex gap-6 text-white text-5xl font-bold">
              <motion.div
                className="bg-white/10 rounded-full px-6 py-3 border border-white/30"
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
              >
                ←
              </motion.div>
              <motion.div
                className="bg-white/10 rounded-full px-6 py-3 border border-white/30"
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "mirror", delay: 0.2 }}
              >
                →
              </motion.div>
            </div>
            <motion.img
              src="/Mano.gif"
              alt="Swipe tutorial"
              className="w-20 h-20 md:hidden opacity-90"
              initial={{ y: -10 }}
              animate={{ y: 10 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estados de carga / error */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-sm">
        {loading && <span className="text-white/80">Cargando obras…</span>}
        {!loading && error && <span className="text-rose-300">{error}</span>}
        {!loading && !error && obras.length === 0 && (
          <span className="text-white/80">No hay obras para mostrar.</span>
        )}
      </div>

      {/* CONTENIDO */}
      {obras.length > 0 && (
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Botón anterior (desktop) */}
            <button
              onClick={anterior}
              className="hidden md:block text-white text-4xl md:text-5xl px-6 py-2 hover:scale-110 transition transform z-20"
            >
              ‹
            </button>

            <div className="w-full max-w-4xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  className="flex flex-col md:flex-row gap-8 items-center"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={transicion}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -100) setTimeout(siguiente, 0);
                    else if (info.offset.x > 100) setTimeout(anterior, 0);
                  }}
                >
                  <motion.img
                    src={obraActual.imagen}
                    alt={obraActual.titulo}
                    className="w-full md:w-1/2 max-h-[500px] object-cover rounded-xl shadow-lg"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.4 }}
                    onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                  />
                  <div className="md:w-1/2 space-y-4 text-center md:text-left">
                    <h2 className="text-3xl font-semibold text-white">{obraActual.titulo}</h2>
                    <div className="text-lg text-gray-300">
                      {(() => {
                        const out = [];
                        const lines = (obraActual.descripcion || "").split(/\r?\n/);
                        for (let i = 0; i < lines.length; i++) {
                          const raw = lines[i] ?? "";

                          // Case 1: "Detalles: contenido" en la misma línea
                          const m = raw.match(/^\s*Detalles\s*:(.*)$/i);
                          if (m) {
                            const after = (m[1] || "").trim();
                            out.push(<span key={`${i}-label`} className="block">Detalles:</span>);
                            if (after) {
                              out.push(<span key={`${i}-content`} className="block">{after}</span>);
                            } else {
                              // si no hay contenido en la misma línea, saltar opcional línea en blanco siguiente
                              if (i + 1 < lines.length && lines[i + 1].trim() === "") i++;
                            }
                            continue;
                          }

                          // Case 2: línea que es solo "Detalles:" (con o sin espacios y dos puntos)
                          if (/^\s*Detalles\s*:?\s*$/i.test(raw)) {
                            out.push(<span key={`${i}-label`} className="block">Detalles:</span>);
                            // si la próxima es vacía, la omitimos para que el contenido empiece inmediatamente debajo
                            if (i + 1 < lines.length && lines[i + 1].trim() === "") i++;
                            continue;
                          }

                          // Cualquier otra línea normal
                          out.push(<span key={i} className="block">{raw.trim()}</span>);
                        }
                        return out;
                      })()}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Botón siguiente (desktop) */}
            <button
              onClick={siguiente}
              className="hidden md:block text-white text-4xl md:text-5xl px-6 py-2 hover:scale-110 transition transform z-20"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}