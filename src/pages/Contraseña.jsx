// ESTE ES EL CÓDIGO DE PerfilUsuario CON HEADER COMPLETO Y CAMBIO DE CONTRASEÑA

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import {
  Home, Image as ImageIcon, Video, ShoppingBag, Brush, User, Mail, LogIn,
  UserPlus, Settings, LogOut, Eye, EyeOff, X, KeyRound, Heart
} from 'lucide-react';
import sha256 from 'crypto-js/sha256';
import { motion, AnimatePresence } from 'framer-motion';

/* ======================= Helpers carrito por usuario ======================= */
function getCartKeyBySession(sesion) {
  // Si hay sesión usa carrito:{id}; de lo contrario usa el carrito global como fallback
  return sesion?.id ? `carrito:${sesion.id}` : 'carrito';
}

function safeCartCount(cartArray) {
  return (cartArray || []).reduce((sum, it) => {
    const qty = Number.isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 1;
    return sum + Math.max(0, qty);
  }, 0);
}

function readCartCountForSession(sesion) {
  try {
    // Intenta primero el carrito por usuario; si no existe, usa el global "carrito"
    const perUserKey = sesion?.id ? `carrito:${sesion.id}` : null;
    const rawUser = perUserKey ? localStorage.getItem(perUserKey) : null;
    const rawGlobal = localStorage.getItem('carrito');
    const parsed = rawUser ? JSON.parse(rawUser) : (rawGlobal ? JSON.parse(rawGlobal) : []);
    return safeCartCount(parsed);
  } catch {
    return 0;
  }
}

const supabase = createClient('https://ousgktyljynqzrnafoqd.supabase.co',  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE');

export default function PerfilUsuario() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cartCount, setCartCount] = useState(0);
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
    try {
      const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
      if (sesion?.id) {
        setUsuarioActivo(sesion);
        setCartCount(readCartCountForSession(sesion));
      } else {
        navigate('/');
      }
    } catch {
      navigate('/');
    }
  }, []);

  // Recalcular contador cuando cambia la sesión, y sincronizar por storage/focus
  useEffect(() => {
    // Recalcula en cambio de sesión
    setCartCount(readCartCountForSession(usuarioActivo));

    const onStorage = (e) => {
      try {
        if (e.key === 'sesionActiva') {
          const nueva = e.newValue ? JSON.parse(e.newValue) : null;
          setUsuarioActivo(nueva?.id ? nueva : null);
          setCartCount(readCartCountForSession(nueva));
          return;
        }
        const keysToWatch = [];
        if (usuarioActivo?.id) keysToWatch.push(`carrito:${usuarioActivo.id}`);
        keysToWatch.push('carrito');
        if (keysToWatch.includes(e.key)) {
          setCartCount(readCartCountForSession(usuarioActivo));
        }
      } catch {
        setCartCount(0);
      }
    };

    const onFocus = () => {
      setCartCount(readCartCountForSession(usuarioActivo));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [usuarioActivo]);

  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem('carrito');
        const prev = JSON.parse(localStorage.getItem('sesionActiva'));
        if (prev?.id) localStorage.removeItem(`carrito:${prev.id}`);
      } catch {}
      localStorage.removeItem('sesionActiva');
      setUsuarioActivo(null);
      setCartCount(0);
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
    { label: "Videos", icon: <Video size={24} />, onClick: () => navigate('/videos') },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate('/tienda') },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate('/restauracion') },
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

    {/* Header animado */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">

      <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          {/* Logo cuadrado más grande */}
          <div className="h-20 sm:h-24 aspect-square overflow-hidden flex items-center justify-center">
            <img
              src="/intro.gif"
              alt="Logo animado"
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.src = "/logo.png"; }}
            />
          </div>

          {/* Texto alineado con el logo */}
          <div className="flex gap-2 sm:gap-6 text-lg sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
            <span>ARTE</span>
            <span>RESTAURACIÓN</span>
            <span>VISUALES</span>
          </div>
        </div>

            {/* User / carrito */}
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
                          <button onClick={() => navigate("/usuario")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <User size={16} className="mr-2" /> Información de cuenta
                          </button>
                          <button onClick={() => navigate("/direccion")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <Mail size={16} className="mr-2" /> Direcciones
                          </button>
                          <button onClick={() => navigate("/favoritos")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <Heart size={16} className="mr-2" /> Favoritos
                          </button>
                          <button onClick={() => navigate("/contrasena")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <KeyRound size={16} className="mr-2" /> Cambiar contraseña
                          </button>
                          <button onClick={cerrarSesion} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100 text-red-600">
                            <LogOut size={16} className="mr-2" /> Cerrar sesión
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => navigate("/iniciar-sesion")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <LogIn size={16} className="mr-2" /> Iniciar sesión
                          </button>
                          <button onClick={() => navigate("/registro")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
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
                  onClick={() => navigate("/carrito")}
                  className="relative group"
                  title="Carrito"
                  aria-label={`Carrito con ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}`}
                >
                  <span
                    className="grid place-items-center rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md transition
                               h-11 w-11 group-hover:shadow-lg group-hover:scale-105"
                  >
                    <ShoppingBag size={22} className="text-[#a16207]" />
                  </span>

                  {cartCount > 0 && (
                    <span
                      className="absolute -right-1 -top-1 rounded-full text-[11px] font-bold
                                 bg-rose-600 text-white h-5 min-w-[20px] px-1.5 grid place-items-center
                                 ring-2 ring-white shadow"
                      style={{ lineHeight: 1 }}
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="w-full border-t border-gray-500 opacity-70 mt-2" />
          <div className="w-full border-t-2 border-gray-500 opacity-70 mt-[2px]" />

          {/* Firma */}
          <div className="text-sm italic text-gray-600 pt-1 text-right sm:text-right text-center pr-1">
            por: Laura García
          </div>

          {/* Menú */}
          <nav className="flex flex-wrap justify-center gap-3 sm:gap-6 text-sm sm:text-lg font-medium pt-2">
            {menu.map((item, index) => (
              <motion.span
                key={index}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-1 cursor-pointer px-2 sm:px-3 py-1 transition-all duration-300 ease-out
                  ${hovered === index
                    ? "bg-white/50 backdrop-blur-sm shadow-inner rounded-md scale-105 underline underline-offset-4"
                    : "hover:bg-white/30 hover:backdrop-blur-sm hover:shadow-sm hover:rounded-md"
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
