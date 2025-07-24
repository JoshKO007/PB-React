import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn, Home, Image as ImageIcon, ShoppingBag, User, Newspaper,
  Mail, UserPlus, Settings, Eye, EyeOff, Brush, Video, KeyRound
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import sha256 from 'crypto-js/sha256';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ousgktyljynqzrnafoqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE'
);

export default function InicioSesion() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [hovered, setHovered] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const hashedPassword = sha256(password).toString();
    const esEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario);

    try {
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq(esEmail ? 'email' : 'usuario', usuario)
        .eq('password', hashedPassword)
        .single();

      if (error || !user) {
        setErrorMsg('Usuario o contraseña incorrectos');
      } else {
        setSuccessMsg('Sesión iniciada correctamente');
        localStorage.setItem('sesionActiva', JSON.stringify(user));
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error) {
      setErrorMsg('Error al conectar con el servidor');
    }
  };

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
  className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
>
  <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">

    {/* Sección superior: Logo + Título + Iconos */}
    <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
      {/* Logo + Título */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
        <img src="/logo.png" alt="Logo" className="h-14 sm:h-16" />
        <div className="flex gap-2 sm:gap-6 text-lg sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
          <span>ARTE</span>
          <span>RESTAURACIÓN</span>
          <span>VISUALES</span>
        </div>
      </div>

      {/* Iconos de usuario y carrito */}
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
                    <button onClick={() => navigate('/usuario')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <User size={16} className="mr-2" /> Información de cuenta
                    </button>
                    <button onClick={() => navigate('/direccion')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <Mail size={16} className="mr-2" /> Direcciones
                    </button>
                    <button onClick={() => navigate('/contrasena')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                      <KeyRound size={16} className="mr-2" /> Cambiar contraseña
                    </button>
                    <button onClick={cerrarSesion} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100 text-red-600">
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
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

    <div className="w-full border-t border-gray-500 opacity-70 mt-2" />
    <div className="w-full border-t-2 border-gray-500 opacity-70 mt-[2px]" />

    {/* Firma de autor */}
    <div className="text-sm italic text-gray-600 pt-1 text-right sm:text-right text-center pr-1">
      por: Laura García
    </div>

    {/* Menú de navegación */}
    <nav className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm sm:text-lg font-medium pt-2">
      {menu.map((item, index) => (
        <motion.span
          key={index}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          onClick={item.onClick}
          className={`flex flex-col items-center gap-1 cursor-pointer px-2 sm:px-3 py-1 transition-all duration-300 ease-out
            ${hovered === index
              ? 'bg-white/50 backdrop-blur-sm shadow-inner rounded-md scale-105 underline underline-offset-4'
              : 'hover:bg-white/30 hover:backdrop-blur-sm hover:shadow-sm hover:rounded-md'
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

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white p-10 rounded-xl shadow-xl w-full max-w-md border border-gray-200"
        >
          <div className="text-center mb-8">
            <LogIn size={40} className="mx-auto text-[#a16207]" />
            <h2 className="text-3xl font-bold mt-4 text-[#333]">Iniciar Sesión</h2>
            <p className="text-sm text-gray-600">Bienvenido de nuevo, accede a tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-gray-700">
                Usuario o correo electrónico
              </label>
              <input
                type="text"
                id="usuario"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="mt-1 w-full border border-gray-300 px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207]"
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-gray-300 px-4 py-2 pr-10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {errorMsg && <div className="text-red-600 text-sm text-center">{errorMsg}</div>}
            {successMsg && <div className="text-green-600 text-sm text-center">{successMsg}</div>}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-[#a16207] text-white py-2 px-4 rounded-md shadow hover:bg-[#854d06] transition"
            >
              Entrar
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-[#a16207] font-medium hover:underline">
              Crea una aquí
            </Link>
          </div>

          <div className="text-center mt-4">
            <Link
              to="/recuerdo"
              className="text-sm text-[#a16207] font-medium hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </motion.div>
      </div>

      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Cámara descompuesta. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
