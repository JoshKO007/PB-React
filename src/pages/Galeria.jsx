import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FondoParticulas from "../components/FondoParticulas";
import { Volume2, VolumeX, LogOut, Music, Music2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const obras = [
  {
    titulo: 'Fragmentos de silencio',
    descripcion: 'Acrílico sobre lienzo. Serie introspectiva que explora la memoria emocional.',
    imagen: '/obras/obra1.jpg',
  },
  {
    titulo: 'Ecos de lo invisible',
    descripcion: 'Técnica mixta. Una obra que sugiere el movimiento del pensamiento.',
    imagen: '/obras/obra2.jpeg',
  },
  {
    titulo: 'Sombras del alba',
    descripcion: 'Carboncillo sobre papel. Fragmentos de la frontera entre sueño y vigilia.',
    imagen: '/obras/obra3.jpg',
  },
];

export default function Galeria() {
  const [index, setIndex] = useState(0);
  const [mostrarTutorial, setMostrarTutorial] = useState(true);
  const [narradorActivo, setNarradorActivo] = useState(false);
  const [musicaActiva, setMusicaActiva] = useState(true);
  const [mostrarDialogo, setMostrarDialogo] = useState(true);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const siguiente = () => {
    setIndex((prev) => (prev + 1) % obras.length);
    ocultarTutorial();
  };

  const anterior = () => {
    setIndex((prev) => (prev - 1 + obras.length) % obras.length);
    ocultarTutorial();
  };

  const ocultarTutorial = () => setMostrarTutorial(false);

  const transicion = {
    duration: 0.6,
    ease: [0.43, 0.13, 0.23, 0.96],
  };

  const narrarObra = (obra) => {
    if (!narradorActivo) return;
    window.speechSynthesis.cancel();

    const texto = `${obra.titulo}. ${obra.descripcion}`;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-MX';

    const voces = window.speechSynthesis.getVoices();
    const vozApple = voces.find(v => v.name.toLowerCase().includes("paulina") || v.name.toLowerCase().includes("mónica"));
    if (vozApple) utterance.voice = vozApple;

    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (narradorActivo) narrarObra(obras[index]);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [index, narradorActivo]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') siguiente();
      if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <div className="relative min-h-screen bg-[#0d0d0d] text-white overflow-hidden" ref={containerRef}>
      <FondoParticulas />
      <audio ref={audioRef} src="/audio/fondo.mp3" loop />

      {/* Diálogo de activación del narrador */}
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
                  onClick={() => {
                    setNarradorActivo(true);
                    setMostrarDialogo(false);
                  }}
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

      {/* Botones verticales (narrador y música) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        {/* Narrador */}
        <div className="group flex flex-row-reverse items-center gap-2">
          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              setNarradorActivo(prev => !prev);
            }}
            className="bg-white/10 border border-white/20 text-white p-3 rounded-full backdrop-blur hover:scale-110 transition"
          >
            {narradorActivo ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <span className="opacity-0 group-hover:opacity-100 transition text-sm text-white whitespace-nowrap">
            {narradorActivo ? "Desactivar narrador" : "Activar narrador"}
          </span>
        </div>

        {/* Música */}
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

      {/* Tutorial simbólico */}
      <AnimatePresence>
        {mostrarTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 w-full flex justify-center items-center z-40 pointer-events-none"
          >
            <div className="hidden md:flex gap-6 text-white text-5xl font-bold">
              <motion.div className="bg-white/10 rounded-full px-6 py-3 border border-white/30" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                ←
              </motion.div>
              <motion.div className="bg-white/10 rounded-full px-6 py-3 border border-white/30" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}>
                →
              </motion.div>
            </div>
            <motion.img
              src="/Mano.gif"
              alt="Swipe tutorial"
              className="w-20 h-20 md:hidden opacity-90"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Galería de obras */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-12">
          <button
            onClick={anterior}
            className="text-white text-4xl md:text-5xl px-6 py-2 hover:scale-110 transition transform z-20"
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
                  if (info.offset.x < -100) siguiente();
                  else if (info.offset.x > 100) anterior();
                }}
              >
                <motion.img
                  src={obras[index].imagen}
                  alt={obras[index].titulo}
                  className="w-full md:w-1/2 max-h-[500px] object-cover rounded-xl shadow-lg"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.4 }}
                />
                <div className="md:w-1/2 space-y-4 text-center md:text-left">
                  <h2 className="text-3xl font-semibold text-white">{obras[index].titulo}</h2>
                  <p className="text-lg text-gray-300">{obras[index].descripcion}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={siguiente}
            className="text-white text-4xl md:text-5xl px-6 py-2 hover:scale-110 transition transform z-20"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
