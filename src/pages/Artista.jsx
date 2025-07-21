import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import {
  Home, Image as ImageIcon, Video, ShoppingBag, Brush, User, Mail,
  LogIn, UserPlus, Settings, LogOut
} from 'lucide-react';

export default function SobreArtista() {
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();
  const handleUserMouseEnter = () => {
  clearTimeout(userMenuTimeout.current);
  setShowUserMenu(true);
};

const handleUserMouseLeave = () => {
  userMenuTimeout.current = setTimeout(() => {
    setShowUserMenu(false);
  }, 300);
};


  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.usuario) setUsuarioActivo(sesion);
  }, []);

  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      localStorage.removeItem('sesionActiva');
      setUsuarioActivo(null);
      setCerrandoSesion(false);
      navigate('/');
    }, 5000);
  };

  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate('/') },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate('/galeria') },
    { label: "Videos", icon: <Video size={24} /> },
    { label: "Tienda", icon: <ShoppingBag size={24} /> },
    { label: "Restauración", icon: <Brush size={24} /> },
    { label: "Sobre la artista", icon: <User size={24} />, onClick: () => navigate('/artista') },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate('/contacto') }
  ];

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col">
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
  className="w-full text-center relative z-40 px-6 py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
>
  <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">

    {/* Sección superior: Logo + Título + Iconos */}
    <div className="flex justify-between items-center w-full relative">
      {/* Logo + Título */}
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="Logo" className="h-16" />
         <div className="flex gap-6 text-xl sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
            <span></span>
            <span>ARTE</span>
            <span>RESTAURACIÓN</span>
            <span>VISUALES</span>
        </div>
      </div>

      {/* Iconos de usuario y carrito */}
      <div className="flex items-center gap-2 pr-2">
        <div
          onMouseEnter={handleUserMouseEnter}
          onMouseLeave={handleUserMouseLeave}
          className="relative"
        >
          <button className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md hover:shadow-lg flex items-center">
            <User size={28} className="text-[#333333]" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onMouseEnter={handleUserMouseEnter}
                onMouseLeave={handleUserMouseLeave}
                className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-xl py-3 text-left z-[9999]"
              >
                {usuarioActivo ? (
                  <>
                    <div className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-800">
                      <User size={16} /> {usuarioActivo.nombre || usuarioActivo.usuario}
                    </div>
                    <button className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <User size={16} className="mr-2" /> Información de cuenta
                    </button>
                    <button className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <Mail size={16} className="mr-2" /> Direcciones
                    </button>
                    <button className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <Settings size={16} className="mr-2" /> Configuración
                    </button>
                    <button
                      onClick={cerrarSesion}
                      className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100 text-red-600"
                    >
                      <LogOut size={16} className="mr-2" /> Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/iniciar-sesion')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <LogIn size={16} className="mr-2" /> Iniciar sesión
                    </button>
                    <button onClick={() => navigate('/registro')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <UserPlus size={16} className="mr-2" /> Crear cuenta
                    </button>
                    <button className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <Settings size={16} className="mr-2" /> Configuración
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Carrito */}
        {usuarioActivo && (
          <button
            onClick={() => navigate('/carrito')}
            className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md hover:shadow-lg flex items-center"
            title="Carrito"
          >
            <ShoppingBag size={22} className="text-[#a16207]" />
          </button>
        )}
      </div>
    </div>


    <div className="w-full border-t border-gray-500 opacity-70" />
    <div className="w-full border-t-2 border-gray-500 opacity-70 mt-[2px]" />


    {/* Firma de autor */}
    <div className="text-sm italic text-gray-600 pt-1 text-right pr-1">
      por: Laura García
    </div>

    {/* Menú de navegación */}
    <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-base sm:text-lg font-medium pt-2">
      {menu.map((item, index) => (
        <motion.span
          key={index}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          onClick={item.onClick}
          className={`flex flex-col items-center gap-1 cursor-pointer px-3 py-1 transition-all duration-300 ease-out
            ${hovered === index
              ? 'bg-white/50 backdrop-blur-sm shadow-inner rounded-md scale-105 underline underline-offset-4'
              : 'hover:bg-white/30 hover:backdrop-blur-sm hover:shadow-sm hover:rounded-md'
            }`}
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-[#a16207]">{item.icon}</div>
          <span className="text-sm sm:text-base">{item.label}</span>
        </motion.span>
      ))}
    </nav>
  </div>
</motion.header>

{/* Línea de vida artística distribuida en 2x2 */}
<section className="w-full py-20 px-6 max-w-6xl mx-auto">
  {/* Biografía con imagen */}
  <div className="grid md:grid-cols-2 gap-10 items-center">
    <img
      src="/artista.jpg"
      alt="Artista"
      className="w-full rounded-xl shadow-xl object-cover"
    />
    <div className="space-y-4">
      <h2 className="text-4xl font-extrabold text-[#a16207]">Sobre la artista</h2>
      <p className="text-lg text-gray-700 leading-relaxed">
        Nacida en el corazón de la ciudad, esta artista ha dedicado su vida a capturar la esencia de las emociones humanas a través del arte visual.
        Su estilo combina técnicas clásicas con una sensibilidad contemporánea, dando vida a cada trazo con autenticidad y profundidad.
      </p>
    </div>
  </div>

  {/* Línea de vida */}
  <h3 className="text-3xl font-bold text-center text-[#a16207] mt-24 mb-20">Línea de vida artística</h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
    {[
      {
        titulo: "Formación y primeros pasos",
        eventos: [
          { año: "1990", evento: "Nace en Ciudad de México." },
          { año: "2010", evento: "Comienza sus estudios en la Facultad de Artes y Diseño de la UNAM." },
          { año: "2011", evento: "Explora el arte textil y el collage como lenguajes visuales." },
          { año: "2012", evento: "Estudia pintura renacentista en Florencia, Italia, durante un intercambio académico." }
        ]
      },
      {
        titulo: "Trayectoria profesional",
        eventos: [
          { año: "2015", evento: "Primera exposición individual en Casa Lamm, CDMX." },
          { año: "2016", evento: "Participa en la Bienal Nacional de Artes Visuales." },
          { año: "2017", evento: "Colabora con muralistas en Oaxaca en proyectos sociales." },
          { año: "2019", evento: "Expone en el Festival de Arte Contemporáneo en Buenos Aires." }
        ]
      },
      {
        titulo: "Reconocimientos y residencias",
        eventos: [
          { año: "2020", evento: "Gana el Premio Nacional de Arte Contemporáneo con 'Raíz de vida'." },
          { año: "2021", evento: "Realiza residencia artística en Berlín sobre arte y migración." },
          { año: "2022", evento: "Invitada como ponente en el Encuentro Iberoamericano de Artistas Visuales." }
        ]
      },
      {
        titulo: "Proyectos contemporáneos y digitales",
        eventos: [
          { año: "2023", evento: "Lanza la galería digital 'Fragmentos del alma', con narración y ambientación sonora." },
          { año: "2024", evento: "Trabaja en obras que exploran la inteligencia artificial como medio artístico." },
          { año: "2025", evento: "Abre su primera exposición completamente inmersiva en realidad virtual." }
        ]
      }
    ].map((seccion, i) => (
      <div key={i} className="space-y-6">
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
                <p className="text-lg text-gray-800"><strong>{item.año}:</strong> {item.evento}</p>
            </motion.div>
            ))}
        </div>
      </div>
    ))}
  </div>
</section>


{/* Manifiesto artístico general */}
<section className="relative max-w-6xl mx-auto px-6 py-20">
  {/* Fondo suave tipo glass */}
  <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-3xl shadow-xl -z-10" />

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
      {
        titulo: "El arte como lenguaje",
        texto:
          "Más allá de la técnica, el arte es una forma de comunicación profunda. Cada obra plantea preguntas, abre espacios de diálogo y se convierte en un puente entre mundos visibles e invisibles."
      },
      {
        titulo: "La materia como idea",
        texto:
          "Los materiales no son neutros. Cada soporte, textura o pigmento lleva consigo historia, memoria y simbolismo. Elegirlos es ya una decisión narrativa y conceptual."
      },
      {
        titulo: "Tiempo y contemplación",
        texto:
          "Crear y observar requieren tiempo. En una era de inmediatez, el arte invita a detenerse, a mirar con pausa, a experimentar la profundidad de lo aparentemente simple."
      },
      {
        titulo: "El cuerpo como herramienta",
        texto:
          "La creación nace del cuerpo: del movimiento, del gesto, del error. No importa el medio, siempre hay una fisicalidad implícita, un pulso que deja huella."
      },
      {
        titulo: "Tecnología como extensión",
        texto:
          "Lo digital no niega lo humano. Al contrario, puede expandirlo. El arte contemporáneo dialoga con lo virtual, lo inmersivo y lo interactivo como nuevas formas de presencia y emoción."
      },
      {
        titulo: "Procesos antes que resultados",
        texto:
          "El arte es también exploración. El proceso importa tanto como la obra final. Cada etapa, cada prueba, cada fallo forma parte del mensaje y la experiencia estética."
      }
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


    {/* Técnicas y materiales */}
    <section className="max-w-6xl mx-auto px-6 py-20">
    <h3 className="text-3xl font-bold text-center text-[#a16207] mb-10">Técnicas y materiales</h3>
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-center">
        {[
        "Acrílico sobre lienzo",
        "Papel reciclado artesanal",
        "Técnica mixta (collage, textil)",
        "Grafito y tinta china",
        "Intervención digital",
        "Instalaciones sensoriales"
        ].map((item, idx) => (
        <div key={idx} className="bg-white/70 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <p className="text-lg font-medium text-gray-800">{item}</p>
        </div>
        ))}
    </div>
    </section>



      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Cámara descompuesta. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

