import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  LogOut, 
  Calendar
} from 'lucide-react';

const supabase = createClient(
  'https://ousgktyljynqzrnafoqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE'
);

export default function PerfilUsuario() {
  const [hovered, setHovered] = useState(null);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [datosPerfil, setDatosPerfil] = useState({
    nombre: '', apellido: '', email: '', telefono: '', usuario: '',
    nacimiento: null, genero: '', bio: ''
  });
  const [exitoGuardado, setExitoGuardado] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState(false);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuTimeout = useRef(null);

  
    useEffect(() => {
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % productos.length);
      }, 4000);
      return () => clearInterval(interval);
    }, []);
  
    useEffect(() => {
      const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
     if (sesion?.id && sesion.id !== usuarioActivo?.id) {
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

  const configurar = () => {
    navigate('/configuracion');
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

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.id) {
      setUsuarioActivo(sesion);
      setDatosPerfil(prev => ({
        ...prev,
        nombre: sesion.nombre || '',
        apellido: sesion.apellido || '',
        email: sesion.email || '',
        telefono: sesion.telefono || '',
        usuario: sesion.usuario || ''
      }));
      cargarDatosComplementarios(sesion.id);
    }
  }, []);

  const cargarDatosComplementarios = async (id) => {
    const { data, error } = await supabase
      .from("datos_complementarios")
      .select("*")
      .eq("id_usuario", id)
      .maybeSingle();

    if (!error && data) {
      setDatosPerfil(prev => ({
        ...prev,
        nacimiento: data.nacimiento ? new Date(data.nacimiento) : null,
        genero: data.genero || '',
        bio: data.bio || ''
      }));
    }
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


  const guardarPerfil = async () => {
    if (!usuarioActivo) return;
    const { nombre, apellido, email, telefono, usuario, nacimiento, genero, bio } = datosPerfil;

    const { data: correoExistente } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .neq("id", usuarioActivo.id)
      .maybeSingle();

    if (correoExistente) return setErrorCorreo(true);

    const { data: usuarioExistente } = await supabase
      .from("usuarios")
      .select("id")
      .eq("usuario", usuario)
      .neq("id", usuarioActivo.id)
      .maybeSingle();

    if (usuarioExistente) return setErrorUsuario(true);

    const { error: errorUsuarioUpdate } = await supabase
      .from("usuarios")
      .update({ nombre, apellido, email, telefono, usuario })
      .eq("id", usuarioActivo.id);

    if (errorUsuarioUpdate) return toast.error("Error al actualizar usuario");

    const { data: updateData } = await supabase
      .from("datos_complementarios")
      .update({ nacimiento, genero, bio, updated_at: new Date() })
      .eq("id_usuario", usuarioActivo.id)
      .select();

    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabase
        .from("datos_complementarios")
        .insert([{ id_usuario: usuarioActivo.id, nacimiento, genero, bio }]);

      if (insertError) return toast.error("Error al insertar datos complementarios");
    }

    const { data: actualizado } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", usuarioActivo.id)
      .maybeSingle();

    if (actualizado) {
      setUsuarioActivo(actualizado);
      localStorage.setItem("sesionActiva", JSON.stringify(actualizado));
    }

    setExitoGuardado(true);
  };

  const handlePerfilChange = (e) => {
    const { name, value } = e.target;
    setDatosPerfil(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      {/* motion.header */}
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
                    <button 
                    onClick={() => navigate('/usuario')}
                    className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
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

      <div className="max-w-4xl mx-auto p-6 relative">
        <h2 className="text-2xl font-bold mb-6 text-[#a16207]">Editar perfil</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <Campo label="Nombre" name="nombre" value={datosPerfil.nombre} onChange={handlePerfilChange} />
          <Campo label="Apellido" name="apellido" value={datosPerfil.apellido} onChange={handlePerfilChange} />
          <Campo label="Correo electrónico" name="email" value={datosPerfil.email} onChange={handlePerfilChange} />
          <Campo label="Usuario" name="usuario" value={datosPerfil.usuario} onChange={handlePerfilChange} />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Campo label="Teléfono" name="telefono" value={datosPerfil.telefono} onChange={handlePerfilChange} />
          <div>
            <label className="text-sm text-gray-600 block mb-1">Nacimiento</label>
            <DatePicker
              selected={datosPerfil.nacimiento}
              onChange={(date) => setDatosPerfil(prev => ({ ...prev, nacimiento: date }))}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona una fecha"
              locale={es}
              showYearDropdown
              customInput={<CustomInput />}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Género</label>
            <div className="relative">
              <select
                name="genero"
                value={datosPerfil.genero}
                onChange={handlePerfilChange}
                className="appearance-none w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207]/50 bg-white pr-10"
              >
                <option value="">Selecciona</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="No binario">No binario</option>
                <option value="Otro">Otro</option>
                <option value="Prefiero no decirlo">Prefiero no decirlo</option>
              </select>
              <svg
                className="absolute top-1/2 right-3 w-4 h-4 text-gray-500 pointer-events-none transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Campo label="Biografía" name="bio" value={datosPerfil.bio} onChange={handlePerfilChange} textarea />
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={guardarPerfil}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Guardar cambios
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500 transition"
          >
            Cancelar
          </button>
        </div>

        {exitoGuardado && (
          <Modal mensaje="Cambios guardados con éxito" color="green" onClose={() => navigate('/')} />
        )}

        {errorCorreo && (
          <Modal mensaje="Ese correo ya está en uso por otro usuario." color="red" onClose={() => setErrorCorreo(false)} />
        )}

        {errorUsuario && (
          <Modal mensaje="Ese nombre de usuario ya está en uso por otro usuario." color="red" onClose={() => setErrorUsuario(false)} />
        )}
      </div>
    </div>
  );
}

// Input personalizado para DatePicker
const CustomInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    onClick={onClick}
    ref={ref}
    type="button"
    className="w-full h-[48px] p-3 border border-gray-300 rounded-md shadow-sm flex items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-[#a16207]/50"
  >
    <span className={`flex-1 truncate ${!value ? 'text-gray-400' : 'text-black'}`}>{value || placeholder}</span>
    <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
  </button>
));

// Campo genérico de entrada
function Campo({ label, name, value, onChange, type = 'text', textarea = false }) {
  return (
    <div>
      <label className="text-sm text-gray-600 block mb-1">{label}</label>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207]/50"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207]/50"
        />
      )}
    </div>
  );
}

// Componente modal reutilizable
function Modal({ mensaje, color = 'green', onClose }) {
  const colores = {
    green: {
      bg: 'bg-[#15803d]',
      hover: 'hover:bg-[#166534]',
      text: 'text-[#15803d]',
    },
    red: {
      bg: 'bg-[#b91c1c]',
      hover: 'hover:bg-[#991b1b]',
      text: 'text-[#b91c1c]',
    },
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
        <h3 className={`text-lg font-semibold ${colores[color].text}`}>{color === 'green' ? 'Éxito' : 'Error'}</h3>
        <p className="text-sm text-gray-600 mt-2">{mensaje}</p>
        <button
          onClick={onClose}
          className={`mt-4 ${colores[color].bg} text-white px-4 py-2 rounded ${colores[color].hover} transition`}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
