// ESTE ES EL CÓDIGO DE PerfilUsuario CON HEADER COMPLETO Y CAMBIO DE CONTRASEÑA

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import {
  Home, Image as ImageIcon, Video, ShoppingBag, Brush, User, Mail, LogIn,
  UserPlus, Settings, LogOut, Eye, EyeOff, X
} from 'lucide-react';
import sha256 from 'crypto-js/sha256';
import { motion, AnimatePresence } from 'framer-motion';

const supabase = createClient('https://ousgktyljynqzrnafoqd.supabase.co',  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE');

export default function PerfilUsuario() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [modalMensaje, setModalMensaje] = useState(null); // { tipo: 'exito' | 'error', mensaje: string }
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.id) {
      setUsuarioActivo(sesion);
    } else {
      navigate('/');
    }
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

  const actualizarContrasena = async () => {
    if (!usuarioActivo) return;
    if (contrasena.length < 6) {
      return setModalMensaje({ tipo: 'error', mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (contrasena !== confirmarContrasena) {
      return setModalMensaje({ tipo: 'error', mensaje: 'Las contraseñas no coinciden' });
    }

    const hashed = sha256(contrasena).toString();
    const { error } = await supabase.from('usuarios').update({ password: hashed }).eq('id', usuarioActivo.id);

    if (error) {
      setModalMensaje({ tipo: 'error', mensaje: 'Error al actualizar la contraseña' });
    } else {
      setModalMensaje({ tipo: 'exito', mensaje: 'Contraseña actualizada correctamente' });
    }
  };

  const cerrarModal = () => {
    setModalMensaje(null);
    if (modalMensaje?.tipo === 'exito') {
      navigate('/');
    }
  };

  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate('/') },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate('/galeria') },
    { label: "Videos", icon: <Video size={24} /> },
    { label: "Tienda", icon: <ShoppingBag size={24} /> },
    { label: "Restauración", icon: <Brush size={24} /> },
    { label: "Sobre la artista", icon: <User size={24} />, onClick: () => navigate('/artista') },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate('/contacto') },
  ];

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      {modalMensaje && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <div className={`text-lg font-semibold mb-4 ${modalMensaje.tipo === 'exito' ? 'text-green-600' : 'text-red-600'}`}>{modalMensaje.mensaje}</div>
            <button
              onClick={cerrarModal}
              className="mt-2 px-4 py-2 bg-[#a16207] text-white rounded hover:bg-[#854d06]"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

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

      <div className="flex-grow flex items-center justify-center w-full p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#a16207]">Cambiar contraseña</h2>
          <div className="space-y-6">
            <div className="relative">
              <Campo
                label="Nueva contraseña"
                name="password"
                type={mostrarContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena(p => !p)}
                className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
              >
                {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <Campo
                label="Confirmar contraseña"
                name="confirm"
                type={mostrarConfirmacion ? 'text' : 'password'}
                value={confirmarContrasena}
                onChange={e => setConfirmarContrasena(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmacion(p => !p)}
                className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
              >
                {mostrarConfirmacion ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex justify-between gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex-1 border border-gray-400 text-gray-700 px-4 py-2 rounded hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={actualizarContrasena}
                className="flex-1 bg-[#a16207] text-white px-4 py-2 rounded hover:bg-[#854d06]  transition"
              >
                Guardar contraseña
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, name, value, onChange, icon, type = 'text', textarea = false }) {
  return (
    <div>
      <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">{icon} {label}</label>
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
