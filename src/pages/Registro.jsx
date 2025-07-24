// src/pages/Registro.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn, Home, Image as ImageIcon, ShoppingBag, User, Newspaper,
  Mail, UserPlus, Settings, Eye, EyeOff, Brush, Video, KeyRound
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import sha256 from 'crypto-js/sha256';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ousgktyljynqzrnafoqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Registro() {
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    usuario: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    if (!formData.email.includes('@')) newErrors.email = 'Correo inválido';
    if (!formData.telefono.match(/^[0-9]{10}$/)) newErrors.telefono = 'Teléfono inválido (10 dígitos)';
    if (!formData.usuario.trim()) newErrors.usuario = 'Nombre de usuario requerido';
    if (formData.password.length < 6) newErrors.password = 'Contraseña muy corta (mínimo 6 caracteres)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError('');

    const userId = uuidv4();
    const hashedPassword = sha256(formData.password).toString();
    const userData = {
      id: userId,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      telefono: formData.telefono,
      usuario: formData.usuario,
      password: hashedPassword
    };

    try {
      const { data: existingUser, error: findError } = await supabase
        .from('usuarios')
        .select('id')
        .or(`email.eq.${formData.email},usuario.eq.${formData.usuario}`)
        .maybeSingle();

      if (existingUser) {
        setSubmitError('Ya existe un usuario con ese correo o nombre de usuario');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('usuarios').insert([userData]);
      if (error) throw error;
      navigate('/iniciar-sesion');
    } catch (err) {
      setSubmitError(err.message || 'Error al registrar el usuario');
    } finally {
      setIsSubmitting(false);
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


  const renderInput = (name, placeholder, type = 'text', className = '') => (
    <div className="flex flex-col">
      <input
        name={name}
        type={type}
        value={formData[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className={`rounded-2xl px-4 py-3 border ${errors[name] ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207] ${className}`}
      />
      {errors[name] && <span className="text-red-500 text-sm mt-1">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col">
      {/* ... Header y navegación sin cambios ... */}
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

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

      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-2xl w-full max-w-5xl p-10"
        >
          <div className="text-center mb-10">
            <UserPlus size={48} className="mx-auto text-[#a16207] mb-2" />
            <h2 className="text-4xl font-bold text-[#333]">Crear cuenta</h2>
            <p className="text-sm text-gray-600">Rellena tus datos para registrarte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-6 border-b pb-8 border-gray-300">
              <h3 className="text-xl font-semibold text-[#a16207]">Datos personales</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {renderInput('nombre', 'Nombre(s)')}
                {renderInput('apellido', 'Apellido(s)')}
                {renderInput('email', 'Correo electrónico', 'email', 'md:col-span-2')}
                {renderInput('telefono', 'Teléfono', 'tel', 'md:col-span-2')}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-[#a16207]">Datos de cuenta</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {renderInput('usuario', 'Nombre de usuario')}
                <div className="flex flex-col relative">
                <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Contraseña"
                    className={`rounded-2xl px-4 py-3 pr-12 border ${errors.password ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a16207]`}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {errors.password && <span className="text-red-500 text-sm mt-1">{errors.password}</span>}
                </div>

              </div>
            </div>

            {submitError && <div className="text-red-600 font-medium text-center">{submitError}</div>}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-[#a16207] text-white py-3 px-6 rounded-full shadow-md hover:bg-[#854d06] transition text-lg font-medium disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </motion.button>
          </form>
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
