// src/componentes/Header.jsx
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Image as ImageIcon, Video, ShoppingBag, Brush,
  User, Mail, LogIn, UserPlus, Settings, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';

export default function Header({ usuarioActivo, setUsuarioActivo, cerrarSesion }) {
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
                    <button 
                      onClick={configurar}
                      className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
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
  );
}
