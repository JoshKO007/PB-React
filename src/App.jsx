// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Settings,
  LogOut
} from 'lucide-react';

const productos = [
  {
    titulo: 'Cuadro “Raíz de vida”',
    descripcion: 'Acrílico sobre lienzo. 60x80 cm.',
    imagen: '/producto1.jpg',
    precio: '$1200 MXN'
  },
  {
    titulo: 'Obra “Aurora interna”',
    descripcion: 'Mixta sobre papel reciclado. 50x70 cm.',
    imagen: '/producto2.jpg',
    precio: '$900 MXN'
  },
  {
    titulo: 'Serie “Elementos”',
    descripcion: 'Serie de 3 piezas. Técnica mixta.',
    imagen: '/producto3.jpg',
    precio: '$2100 MXN'
  }
];

export default function App() {
  const [hovered, setHovered] = useState(null);
  const [index, setIndex] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % productos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.usuario) {
      setUsuarioActivo(sesion);
    }
  }, []);

  const handleUserMouseEnter = () => {
    clearTimeout(userMenuTimeout.current);
    setShowUserMenu(true);
  };

  const handleUserMouseLeave = () => {
    userMenuTimeout.current = setTimeout(() => {
      setShowUserMenu(false);
    }, 300);
  };

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
    {
      label: "Inicio",
      icon: <Home size={28} />,
      onClick: () => navigate('/')
    },
    { label: "Galería", 
      icon: <ImageIcon size={24} /> ,
      onClick: () => navigate('/galeria')},
    { label: "Videos", icon: <Video size={24} /> },                     
    { label: "Tienda", icon: <ShoppingBag size={24} /> },
    { label: "Restauración", icon: <Brush size={24} /> },               
    { label: "Sobre la artista", 
      icon: <User size={24} />,
      onClick: () => navigate('/artista') }, 
    { label: "Contacto", 
      icon: <Mail size={24} />,
     onClick: () => navigate('/contacto') }, 
  ];
  
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {cerrandoSesion && (
        <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#a16207] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#a16207] font-semibold text-lg">Cerrando sesión...</p>
        </div>
      )}

<motion.header
  initial={{ opacity: 0, y: -30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
  className="w-full text-center relative z-50 px-6 py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
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



      {/* Bienvenida */}
<motion.section
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
  className="w-full relative overflow-hidden border-t border-gray-200"
  style={{ height: '400px' }}
>
  <video
    src="/Pintura.mp4"
    autoPlay
    loop
    muted
    playsInline
    className="absolute inset-0 w-full h-full object-cover"
  />

  {/* Overlay oscuro */}
  <div className="absolute inset-0 bg-black/20 z-10" />

  {/* Contenido encima del video */}
  <div className="relative z-20 h-full flex flex-col justify-center items-center text-center px-4">
    <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white rounded-lg px-4 py-2">
      Bienvenido a la nueva experiencia visual
    </h2>
    <p className="text-lg text-white max-w-xl mx-auto px-6 py-3 rounded-lg leading-relaxed">
      Sumérgete en una galería donde cada trazo cuenta una historia. Todas las obras están hechas a mano, con alma, y ahora puedes llevarlas contigo.
    </p>
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.97 }}
      className="mt-8 px-6 py-3 bg-[#a16207] text-white border border-[#a16207] rounded-full shadow-lg hover:bg-[#854d06] hover:scale-105 transition-all duration-300"
    >
      Ver colección destacada
    </motion.button>
  </div>
</motion.section>


      {/* Sección de productos destacados */}
      <section className="w-full py-16 border-t border-gray-300">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-6 min-h-[500px]">
          <div className="flex items-center justify-center">
            <div className="text-left text-center md:text-left px-2">
              <h3 className="text-4xl font-extrabold mb-6 text-center text-[#a16207]">Obras destacadas</h3>
              <p className="text-lg text-gray-800 font-medium leading-relaxed mb-4">
                Descubre nuestras piezas más populares. Cada una es una ventana al alma de la artista.
              </p>
              <p className="text-lg text-gray-700 font-medium leading-relaxed mb-4">
                Estas obras han sido seleccionadas por su impacto visual y emocional.
              </p>
              <p className="text-lg text-gray-600 font-medium leading-relaxed mb-4">
                Desde trazos delicados hasta composiciones intensas, cada obra ofrece una experiencia única.
              </p>
              <p className="text-lg text-gray-600 font-medium leading-relaxed">
                Explora cada detalle, cada textura, y déjate envolver por la energía que emana de cada creación.
              </p>
            </div>
          </div>

          <div className="hidden md:block w-full h-full bg-gray-300 rounded"></div>

          <div className="flex flex-col items-center justify-center gap-6 px-2">
            <div className="relative w-full max-w-md flex items-center justify-center overflow-hidden min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.6 }}
                  className="absolute w-full p-6 bg-white/60 backdrop-blur-md border border-gray-300 rounded-xl shadow-lg text-center"
                >
                  <img
                    src={productos[index].imagen}
                    alt={productos[index].titulo}
                    className="w-full h-56 object-cover rounded mb-4"
                  />
                  <h4 className="text-lg font-semibold">{productos[index].titulo}</h4>
                  <p className="text-sm text-gray-700">{productos[index].descripcion}</p>
                  <p className="text-base font-medium mt-2 text-[#a16207]">{productos[index].precio}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-[#a16207] text-white border border-[#a16207] rounded-full shadow-md hover:bg-[#854d06] transition-all duration-300"
            >
              Ver más obras
            </motion.button>
          </div>
        </div>
      </section>

      {/* Nueva sección: Conoce al artista */}
      <section className="w-full py-20 bg-white border-t border-gray-300 mt-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="/artista.jpg"
              alt="Artista"
              className="w-full h-auto rounded-lg shadow-lg object-cover"
            />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-[#a16207] mb-6">Conoce a la artista</h2>
            <p className="text-lg leading-relaxed text-gray-700">
              Nacida en el corazón de la ciudad, esta artista ha dedicado su vida a capturar la esencia de las emociones humanas a través del arte visual. Su estilo combina técnicas clásicas con una sensibilidad contemporánea, dando vida a cada trazo con autenticidad. Cada obra es una ventana a su mundo interior, marcado por la pasión, la introspección y una mirada única sobre la belleza cotidiana.
            </p>
          </div>
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
