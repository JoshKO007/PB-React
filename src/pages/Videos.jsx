// src/pages/Videos.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

/* =========================
   Supabase
   ========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   Helpers YouTube
   ========================= */
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return "";
  const v = String(urlOrId).trim();
  if (/^[\w-]{11}$/.test(v)) return v;                // ID directo
  let m = v.match(/youtu\.be\/([\w-]{11})/i);         // youtu.be/ID
  if (m) return m[1];
  m = v.match(/[?&]v=([\w-]{11})/i);                  // watch?v=ID
  if (m) return m[1];
  m = v.match(/\/embed\/([\w-]{11})/i);               // /embed/ID
  if (m) return m[1];
  m = v.match(/\/shorts\/([\w-]{11})/i);              // /shorts/ID
  if (m) return m[1];
  return "";
}
function embedUrl(id) {
  // autoplay=1 y mute=1 para que el autoplay funcione en la mayoría de navegadores
  return id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`
    : "";
}
function thumbUrl(id) {
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "/placeholder.jpg";
}

/* =========================
   Componente
   ========================= */
/* =========================
   Custom YouTube Player (controles propios con “liquid glass”)
   ========================= */
function CustomYTPlayer({ videoId, onUnmute = () => {} }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(25); // 0..100

  const [showUI, setShowUI] = useState(true);
  const [isTouch, setIsTouch] = useState(false);

  // Cargar IFrame API una sola vez
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    setIsTouch(touch);
    if (touch) setShowUI(true);
  }, []);

  // Inicializar y reciclar el player cuando cambia el videoId
  useEffect(() => {
    let interval;
    function create() {
      if (!containerRef.current || !window.YT || !window.YT.Player || !videoId) return;

      // Destruye anterior si existe (evita players huérfanos)
      if (playerRef.current?.destroy) playerRef.current.destroy();

      playerRef.current = new window.YT.Player(containerRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,        // ocultamos controles nativos
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          mute: 1,
          disablekb: 1,       // nosotros manejamos atajos si queremos
          color: "white",
        },
        events: {
          onReady: (e) => {
            setReady(true);
            e.target.mute();
            e.target.playVideo();
            setMuted(true);
            setPlaying(true);
            setDuration(e.target.getDuration() || 0);
            interval = setInterval(() => {
              const t = e.target.getCurrentTime() || 0;
              setCurrent(t);
              setDuration(e.target.getDuration() || 0);
            }, 250);
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
            if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
          },
        },
      });
    }

    if (!window.YT || !window.YT.Player) {
      window.onYouTubeIframeAPIReady = () => create();
    } else {
      create();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, [videoId]);

  // helpers
  const fmt = (s) => {
    const v = Math.max(0, Math.floor(s || 0));
    const m = String(Math.floor(v / 60)).padStart(2, "0");
    const ss = String(v % 60).padStart(2, "0");
    return `${m}:${ss}`;
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      p.setVolume(volume);
      setMuted(false);
      try { onUnmute(); } catch {}
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const onSeek = (e) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const val = Number(e.target.value); // 0..100
    const t = (val / 100) * duration;
    p.seekTo(t, true);
    setCurrent(t);
  };

  const onVol = (e) => {
    const p = playerRef.current;
    if (!p) return;
    const v = Math.max(0, Math.min(100, Number(e.target.value)));
    setVolume(v);
    p.setVolume(v);
    if (v === 0 && !muted) {
      p.mute();
      setMuted(true);
    } else if (v > 0 && muted) {
      p.unMute();
      setMuted(false);
    }
  };

  const goFullscreen = () => {
    // usamos el contenedor visible del player para fullscreen
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => !isTouch && setShowUI(true)}
      onMouseLeave={() => !isTouch && setShowUI(false)}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* player mount point */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Liquid glass overlay */}
      <div className={`absolute inset-x-0 bottom-0 z-10 p-3 transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div
          className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          style={{
            WebkitBackdropFilter: "blur(16px)",
            backgroundImage:
              "radial-gradient(120% 120% at 10% 10%, rgba(255,255,255,0.12), rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.03) 70%, rgba(255,255,255,0.02) 100%)",
          }}
        >
          {/* progreso */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/85 w-12 tabular-nums">{fmt(current)}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={onSeek}
              className="w-full h-1.5 accent-[#a16207]"
              aria-label="Progreso"
            />
            <span className="text-xs text-white/85 w-12 tabular-nums text-right">{fmt(duration)}</span>
          </div>

          {/* controles */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10"
                aria-label={playing ? "Pausar" : "Reproducir"}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <button
                onClick={toggleMute}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10"
                aria-label={muted ? "Activar sonido" : "Silenciar"}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-white/80">Vol</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={onVol}
                  className="w-28 accent-[#a16207]"
                  aria-label="Volumen"
                />
              </div>
            </div>

            <button
              onClick={goFullscreen}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10"
              aria-label="Pantalla completa"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Estado de carga */}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">
          Cargando reproductor…
        </div>
      )}
    </div>
  );
}

export default function Videos() {
  const navigate = useNavigate();

  // UI
  const [darkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [showAudioTip, setShowAudioTip] = useState(true);
  // Filtro de categoría ("" = todas)
  const [filterCategoria, setFilterCategoria] = useState("");

  // Datos
  const [rows, setRows] = useState([]); // [{id, video_id, url, titulo, descripcion, publicado}]
  const current = rows[index];

  // Fondo de partículas
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let rafId;
    let particles = [];
    const colors = ["#facc15", "#ffffff", "#fde68a"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 1,
        sx: Math.random() * 0.4 - 0.2,
        sy: Math.random() * 0.4 - 0.2,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
        p.x += p.sx;
        p.y += p.sy;
        if (p.x < 0 || p.x > canvas.width) p.sx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.sy *= -1;
      });
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Cargar videos publicados desde Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        let qv = supabase
          .from("videos")
          .select("id, video_id, url, titulo, descripcion, categoria, publicado, created_at")
          .eq("publicado", true)
          .order("created_at", { ascending: false });
        if (filterCategoria) {
          qv = qv.eq("categoria", filterCategoria);
        }
        const { data, error } = await qv;

        if (error) throw error;

        const normalized = (data || [])
          .map((v) => ({
            ...v,
            _vid: v.video_id || extractYouTubeId(v.url),
          }))
          .filter((v) => v._vid); // solo los que tengan ID válido

        setRows(normalized);
        setIndex(0);
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [filterCategoria]);

  // Navegación por teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, index]);

  const next = () => setIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
  const prev = () => setIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));

  return (
    <div
      className={`relative w-full min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-500 select-none ${
        darkMode ? "bg-black text-white" : "bg-white text-black"
      }`}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Canvas partículas */}
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />

      {/* Botón salir */}
      <div className="absolute top-5 left-5 z-50 group flex items-center">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-gray-400"
          title="Volver al inicio"
        >
          <LogOut size={20} />
        </button>
        <AnimatePresence>
          <motion.div
            key="salir-text"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="ml-2 px-3 py-1 bg-black/70 text-white text-sm rounded-md origin-left hidden group-hover:flex"
          >
            Salir
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Gradientes laterales */}
      <div className="absolute left-0 top-0 h-full w-[15vw] bg-gradient-to-r from-black via-transparent to-transparent opacity-30 pointer-events-none z-10" />
      <div className="absolute right-0 top-0 h-full w-[15vw] bg-gradient-to-l from-black via-transparent to-transparent opacity-30 pointer-events-none z-10" />

      {showAudioTip && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-full bg-black/70 text-white border border-white/20 px-4 py-2 shadow-lg backdrop-blur">
            <span className="text-sm">Consejo: activa el audio con el ícono 🔊 para escuchar el video.</span>
            <button
              onClick={() => setShowAudioTip(false)}
              className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-2 py-1"
              aria-label="Cerrar aviso"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Flechas desktop */}
      {rows.length > 1 && (
        <div className="hidden md:flex">
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur"
          >
            <ChevronLeft size={30} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur"
          >
            <ChevronRight size={30} />
          </button>
        </div>
      )}

      {/* Flechas mobile */}
      {rows.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex md:hidden gap-6 z-30">
          <button className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur" onClick={prev}>
            <ChevronLeft size={26} />
          </button>
          <button className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur" onClick={next}>
            <ChevronRight size={26} />
          </button>
        </div>
      )}

      {/* Botones de categorías */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full px-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {[
              { label: "Todas", value: "" },
              { label: "Pintura", value: "Pintura" },
              { label: "Restauración", value: "Restauración" },
              { label: "Arte Performance", value: "Arte Performance" },
            ].map((opt) => {
              const active = filterCategoria === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => setFilterCategoria(opt.value)}
                  className={[
                    "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold border backdrop-blur transition",
                    active
                      ? "bg-[#a16207] text-white border-[#a16207]"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  ].join(" ")}
                  title={opt.value ? `Ver ${opt.value}` : "Ver todas"}
                >
                  {opt.label}
                  {active && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-white/90 inline-block" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 w-full max-w-6xl px-6 md:px-10 py-20 relative z-20">
        {/* Player / Loader / Empty / Error */}
        <div
          className="relative w-full md:w-2/3 aspect-video shadow-2xl rounded-lg overflow-hidden border-2 border-white/20 bg-black grid place-items-center"
          onDragStart={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="text-sm text-gray-300">Cargando videos…</div>
          ) : error ? (
            <div className="text-sm text-rose-300">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-300">No hay videos publicados aún.</div>
          ) : (
            <CustomYTPlayer key={current.id} videoId={current._vid} onUnmute={() => setShowAudioTip(false)} />
          )}
        </div>

        {/* Título / Descripción */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current ? current.id : "empty"}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-1/3 flex flex-col gap-4"
          >
            {current ? (
              <>
                <h2 className="text-3xl font-bold text-yellow-400">
                  {current.titulo || "Video"}
                </h2>
                <p className="text-lg text-gray-300 select-text">
                  {current.descripcion || "Sin descripción."}
                </p>

                {/* mini carrusel de thumbs para saltar rápidamente */}
                {rows.length > 1 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {rows.slice(0, 6).map((v, i) => (
                      <button
                        key={v.id}
                        onClick={() => setIndex(i)}
                        className={`relative rounded-lg overflow-hidden border ${
                          i === index ? "border-yellow-400" : "border-white/10 hover:border-white/30"
                        }`}
                        title={v.titulo || v._vid}
                      >
                        <img
                          src={thumbUrl(v._vid)}
                          alt={v.titulo || v._vid}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                        />
                        {i === index && (
                          <span className="absolute inset-0 ring-2 ring-yellow-400 rounded-lg pointer-events-none" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-yellow-400">Videos</h2>
                <p className="text-lg text-gray-300">Cuando carguen aparecerán aquí.</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fondos */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] opacity-90 blur-3xl animate-pulse" />
      <div className="absolute inset-0 z-0 bg-black opacity-40" />
    </div>
  );
}