import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Sun, Moon, LogOut, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const videos = [
  {
    url: '/videos/video1.mp4',
    titulo: 'Renacimiento interior',
    descripcion: 'Una obra audiovisual que explora el viaje espiritual del alma a través del color y el movimiento.'
  },
  {
    url: '/videos/video2.mov',
    titulo: 'El eco del silencio',
    descripcion: 'Experimento sensorial donde la ausencia de sonido resalta cada imagen como un grito contenido.'
  },
  {
    url: '/videos/video3.mp4',
    titulo: 'Luz suspendida',
    descripcion: 'Estudio de la luz atrapada en lo estático, con una narrativa que desafía el tiempo.'
  }
];

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function Videos() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const [hoveringVideo, setHoveringVideo] = useState(false);
  const [readyToPlay, setReadyToPlay] = useState(false);
  const [showClickMessage, setShowClickMessage] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const videoRef = useRef(null);
  const hasUnmutedOnce = useRef(false);
  const navigate = useNavigate();
  const [hoverSalir, setHoverSalir] = useState(false);


  const current = videos[index];

  const nextVideo = () => setIndex((prev) => (prev + 1) % videos.length);
  const prevVideo = () => setIndex((prev) => (prev - 1 + videos.length) % videos.length);

  const canvasRef = useRef(null);

useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const colors = ['#facc15', '#ffffff', '#fde68a'];

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };


  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      speedX: Math.random() * 0.4 - 0.2,
      speedY: Math.random() * 0.4 - 0.2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
    });

    requestAnimationFrame(animate);
  };

  animate();

  return () => window.removeEventListener('resize', resize);
}, []);

    const toggleFullScreen = () => {
  const video = videoRef.current;
  if (!video) return;

  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    video.requestFullscreen().catch((err) => {
      console.error('Error al activar pantalla completa:', err);
    });
  }
};
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      if (readyToPlay && playing) {
        video.play().catch(() => {});
      } else if (readyToPlay && !playing) {
        video.pause();
      }
    }
  }, [playing, muted, index, readyToPlay]);


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoaded = () => {
      setDuration(video.duration);
      setReadyToPlay(true);
      setPlaying(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoaded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoaded);
    };
  }, [index]);

  useEffect(() => {
    const unmuteOnFirstInteraction = () => {
      if (!hasUnmutedOnce.current && videoRef.current) {
        videoRef.current.muted = false;
        setMuted(false);
        hasUnmutedOnce.current = true;
        setShowClickMessage(false);
      }
    };

    window.addEventListener('click', unmuteOnFirstInteraction, { once: true });
    window.addEventListener('keydown', unmuteOnFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', unmuteOnFirstInteraction);
      window.removeEventListener('keydown', unmuteOnFirstInteraction);
    };
  }, []);

  return (
    <div className={`relative w-full min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>

    <canvas
    ref={canvasRef}
    className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none"
    />
      {/* Botón de salida */}
<div className="absolute top-5 left-5 z-50 group flex items-center">
  <button
    onClick={() => navigate('/')}
    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-gray-400"
    title="Volver al inicio"
  >
    <LogOut size={20} />
  </button>

  <AnimatePresence>
    {/* Mostramos texto solo en hover con animación */}
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



      {/* Mensaje inicial */}
      {showClickMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-6 py-2 rounded-full shadow-lg z-50 font-semibold"
        >
          Haz clic para activar sonido
        </motion.div>
      )}

      {/* Bordes reflejados tipo YouTube */}
      <div className="absolute left-0 top-0 h-full w-[15vw] bg-gradient-to-r from-black via-transparent to-transparent opacity-30 pointer-events-none z-10" />
      <div className="absolute right-0 top-0 h-full w-[15vw] bg-gradient-to-l from-black via-transparent to-transparent opacity-30 pointer-events-none z-10" />

        {/* Flechas para escritorio */}
        <div className="hidden md:flex">
        <button onClick={prevVideo} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur">
            <ChevronLeft size={30} />
        </button>
        <button onClick={nextVideo} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur">
            <ChevronRight size={30} />
        </button>
        </div>

        {/* Flechas para móviles (abajo centradas) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex md:hidden gap-6 z-30">
        <button onClick={prevVideo} className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur">
            <ChevronLeft size={26} />
        </button>
        <button onClick={nextVideo} className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur">
            <ChevronRight size={26} />
        </button>
        </div>

      {/* Contenido */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 w-full max-w-6xl px-6 md:px-10 py-20 relative z-20">
        <div
          className="relative w-full md:w-2/3 aspect-video shadow-2xl rounded-lg overflow-hidden border-2 border-white/20 bg-black"
          onMouseEnter={() => setHoveringVideo(true)}
          onMouseLeave={() => setHoveringVideo(false)}
        >
          <video
            key={index}
            ref={videoRef}
            src={current.url}
            autoPlay
            muted={muted}
            loop
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Controles */}
          <AnimatePresence>
            {hoveringVideo && (
              <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  transition={{ duration: 0.5 }}
  className="absolute bottom-3 left-3 right-3 bg-black/50 px-3 py-3 rounded-xl backdrop-blur-md z-20"
>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">

    {/* Controles básicos */}
    <div className="flex items-center justify-start flex-wrap gap-3 sm:gap-5">
      <button onClick={() => setPlaying(!playing)} className="text-white">
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Volumen */}
      <div
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
        className="flex items-center gap-2"
      >
        <button onClick={() => setMuted(!muted)} className="text-white">
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* Slider solo visible en sm+ */}
        <motion.input
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: showVolume ? 1 : 0, x: showVolume ? 0 : -20 }}
          transition={{ duration: 0.3 }}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : videoRef.current?.volume || 0}
          onChange={(e) => {
            const vol = parseFloat(e.target.value);
            if (videoRef.current) videoRef.current.volume = vol;
            setMuted(vol === 0);
          }}
          className="w-20 h-1 accent-yellow-400 cursor-pointer hidden sm:block"
        />

        {/* % solo en sm+ */}
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: showVolume ? 1 : 0, x: showVolume ? 0 : -10 }}
          transition={{ duration: 0.3 }}
          className="text-xs text-white hidden sm:block"
        >
          {Math.round((muted ? 0 : videoRef.current?.volume || 0) * 100)}%
        </motion.span>
      </div>

    </div>

    {/* Barra de progreso */}
    <div className="flex items-center gap-2 w-full sm:w-auto text-white">
      <span className="text-xs sm:text-sm whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={(e) => {
          const newTime = parseFloat(e.target.value);
          setCurrentTime(newTime);
          if (videoRef.current) videoRef.current.currentTime = newTime;
        }}
        className="w-full sm:w-64 h-1 accent-yellow-400 cursor-pointer"
      />
            {/* Pantalla completa */}
      <button
        onClick={toggleFullScreen}
        className="text-white hover:text-yellow-400 transition"
        title="Pantalla completa"
      >
        <Maximize size={20} />
      </button>
    </div>
  </div>
</motion.div>

            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-1/3 flex flex-col gap-4"
          >
            <h2 className="text-3xl font-bold text-yellow-400">{current.titulo}</h2>
            <p className="text-lg text-gray-300">{current.descripcion}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fondo animado */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] opacity-90 blur-3xl animate-pulse" />
      <div className="absolute inset-0 z-0 bg-black opacity-40" />
    </div>
  );
}
