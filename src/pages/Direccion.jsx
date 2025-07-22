// Archivo completo de DireccionesUsuario.jsx con motion.header incluido

import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import countries from 'world-countries';
import estadosJSON from '../data/estadosPorPais.json';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
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
  MapPin,
  Edit2,
  Trash2
} from 'lucide-react';

// Supabase init
const supabase = createClient(
  'https://ousgktyljynqzrnafoqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE'
);

export default function DireccionesUsuario() {
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const userMenuTimeout = useRef(null);

  const [usuarioId, setUsuarioId] = useState(null);
  const [direcciones, setDirecciones] = useState([]);
  const [nuevaDireccion, setNuevaDireccion] = useState(null);
  const [editandoDireccionId, setEditandoDireccionId] = useState(null);
  const [paises, setPaises] = useState([]);
  const [estados, setEstados] = useState([]);
  const [telefonoUsuario, setTelefonoUsuario] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.id) setUsuarioId(sesion.id);
  }, []);

  useEffect(() => {
    const listaPaises = countries
      .map(p => ({ nombre: p.name.common, codigo: p.cca2 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    setPaises(listaPaises);
  }, []);

  useEffect(() => {
    if (nuevaDireccion?.paisCodigo) {
      const estadosFiltrados = estadosJSON
        .filter(e => e.country_code === nuevaDireccion.paisCodigo)
        .map(e => e.name);
      setEstados(estadosFiltrados);
    } else {
      setEstados([]);
    }
  }, [nuevaDireccion?.paisCodigo]);

  useEffect(() => {
    if (!usuarioId) return;

    const cargarDatos = async () => {
      const { data } = await supabase
        .from('usuarios')
        .select('telefono')
        .eq('id', usuarioId)
        .single();

      if (data?.telefono) setTelefonoUsuario(data.telefono);
      cargarDirecciones();
    };

    cargarDatos();
  }, [usuarioId]);

    useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.id) {
      setUsuarioId(sesion.id);
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

  const configurar = () => navigate('/configuracion');

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
    { label: 'Inicio', icon: <Home size={28} />, onClick: () => navigate('/') },
    { label: 'Galería', icon: <ImageIcon size={24} />, onClick: () => navigate('/galeria') },
    { label: 'Videos', icon: <Video size={24} /> },
    { label: 'Tienda', icon: <ShoppingBag size={24} /> },
    { label: 'Restauración', icon: <Brush size={24} /> },
    { label: 'Sobre la artista', icon: <User size={24} />, onClick: () => navigate('/artista') },
    { label: 'Contacto', icon: <Mail size={24} />, onClick: () => navigate('/contacto') }
  ];

  const cargarDirecciones = async () => {
    const { data, error } = await supabase
      .from('direcciones_usuarios')
      .select('*')
      .eq('id_usuario', usuarioId);

    if (!error) setDirecciones(data);
    else toast.error('No se pudieron cargar las direcciones');
  };

  const handleDireccionChange = (e) => {
    const { name, value } = e.target;
    setNuevaDireccion(prev => ({ ...prev, [name]: value }));
  };

  const handlePaisChange = (e) => {
    const codigoPais = e.target.value;
    const paisSeleccionado = paises.find(p => p.codigo === codigoPais);
    setNuevaDireccion(prev => ({
      ...prev,
      pais: paisSeleccionado?.nombre || '',
      paisCodigo: codigoPais,
      estado: '',
      ciudad: ''
    }));
  };

  const handleEstadoChange = (e) => {
    setNuevaDireccion(prev => ({
      ...prev,
      estado: e.target.value,
      ciudad: ''
    }));
  };

  const guardarDireccion = async () => {
    const campos = ['nombre', 'pais', 'estado', 'ciudad', 'calle', 'cp', 'telefono_contacto'];
    const incompletos = campos.filter(c => !nuevaDireccion?.[c]?.trim());

    if (incompletos.length > 0) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    const direccion = {
      id_usuario: usuarioId,
      nombre: nuevaDireccion.nombre.trim(),
      pais: nuevaDireccion.pais.trim(),
      estado: nuevaDireccion.estado.trim(),
      ciudad: nuevaDireccion.ciudad.trim(),
      cp: nuevaDireccion.cp.trim(),
      calle: nuevaDireccion.calle.trim(),
      referencia: nuevaDireccion.referencia?.trim() || '',
      telefono_contacto: nuevaDireccion.telefono_contacto.trim()
    };

    try {
      if (editandoDireccionId) {
        const { data, error } = await supabase
          .from('direcciones_usuarios')
          .update(direccion)
          .eq('id', editandoDireccionId)
          .select();

        if (error) throw error;
        toast.success('Dirección actualizada');
        setDirecciones(prev =>
          prev.map(d => d.id === editandoDireccionId ? data[0] : d)
        );
      } else {
        const { data, error } = await supabase
          .from('direcciones_usuarios')
          .insert(direccion)
          .select();

        if (error) throw error;
        toast.success('Dirección guardada');
        setDirecciones(prev => [...prev, ...data]);
      }

      setNuevaDireccion(null);
      setEditandoDireccionId(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la dirección');
    }
  };

  const eliminarDireccion = async (id) => {
    if (!confirm('¿Eliminar esta dirección?')) return;

    const { error } = await supabase
      .from('direcciones_usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Dirección eliminada');
      setDirecciones(prev => prev.filter(d => d.id !== id));
    }
  };

  const iniciarEdicion = (dir) => {
    const pais = paises.find(p => p.nombre === dir.pais);
    setNuevaDireccion({ ...dir, paisCodigo: pais?.codigo || '' });
    setEditandoDireccionId(dir.id);
  };

  const iniciarNuevaDireccion = () => {
    setNuevaDireccion({
      nombre: '',
      pais: '',
      paisCodigo: '',
      estado: '',
      ciudad: '',
      cp: '',
      calle: '',
      referencia: '',
      telefono_contacto: telefonoUsuario || ''
    });
    setEditandoDireccionId(null);
  };

  if (!usuarioId) return <p className="text-center p-6 text-gray-500">Cargando usuario...</p>;
return (
  <div className="min-h-screen flex flex-col items-center justify-between bg-[#f9f4ef] px-4">
    {cerrandoSesion && (
      <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
        <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
      </div>
    )}

    {/* Header animado */}
    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full text-center relative z-40 px-6 py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
    >
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">
        <div className="flex justify-between items-center w-full relative">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" className="h-16" />
            <div className="flex gap-6 text-xl sm:text-2xl font-semibold font-serif italic text-[#3b4d63] tracking-wide">
              <span>ARTE</span>
              <span>RESTAURACIÓN</span>
              <span>VISUALES</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-2">
            <div onMouseEnter={handleUserMouseEnter} onMouseLeave={handleUserMouseLeave} className="relative">
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
                        <button onClick={() => navigate('/usuario')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                          <User size={16} className="mr-2" /> Información de cuenta
                        </button>
                        <button onClick={() => navigate('/direccion')} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                          <Mail size={16} className="mr-2" /> Direcciones
                        </button>
                        <button onClick={configurar} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                          <Settings size={16} className="mr-2" /> Configuración
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
              <button onClick={() => navigate('/carrito')} className="p-2 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-md hover:shadow-lg flex items-center" title="Carrito">
                <ShoppingBag size={22} className="text-[#a16207]" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full border-t border-gray-500 opacity-70" />
        <div className="w-full border-t-2 border-gray-500 opacity-70 mt-[2px]" />

        <div className="text-sm italic text-gray-600 pt-1 text-right pr-1">
          por: Laura García
        </div>

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
                  : 'hover:bg-white/30 hover:backdrop-blur-sm hover:shadow-sm hover:rounded-md'}
              `}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-[#a16207]">{item.icon}</div>
              <span className="text-sm sm:text-base">{item.label}</span>
            </motion.span>
          ))}
        </nav>
      </div>
    </motion.header>

    {/* Contenido principal */}
    <div className="w-full max-w-4xl bg-white border rounded-xl shadow-lg p-6 flex flex-col justify-between mt-8">
      <h2 className="text-2xl font-bold mb-6 text-[#a16207] text-center">Direcciones guardadas</h2>

      <div className="space-y-4 mb-8">
        {direcciones.map(dir => (
          <div key={dir.id} className="flex items-start gap-4 p-4 border border-gray-300 rounded-md bg-white shadow-sm">
            <MapPin size={24} className="text-blue-600 mt-1" />
            <div className="flex-1">
              <p className="text-base font-bold text-[#a16207]">{dir.nombre}</p>
              <p className="font-semibold">{dir.calle}, {dir.ciudad}, {dir.estado}</p>
              <p className="text-sm text-gray-600">{dir.pais} · CP {dir.cp}</p>
              {dir.referencia && <p className="text-sm text-gray-500 italic">"{dir.referencia}"</p>}
              <p className="text-sm text-gray-600 mt-1">Tel: {dir.telefono_contacto}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => iniciarEdicion(dir)} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                <Edit2 size={14} /> Editar
              </button>
              <button onClick={() => eliminarDireccion(dir.id)} className="text-red-600 hover:underline text-sm flex items-center gap-1">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {!nuevaDireccion ? (
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={iniciarNuevaDireccion}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            <MapPin size={16} /> Agregar nueva dirección
          </button>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            ← Regresar al inicio
          </button>
        </div>
      ) : (
        <FormularioDireccion
          paises={paises}
          estados={estados}
          direccion={nuevaDireccion}
          onChange={handleDireccionChange}
          onPaisChange={handlePaisChange}
          onEstadoChange={handleEstadoChange}
          onCancel={() => {
            setNuevaDireccion(null);
            setEditandoDireccionId(null);
          }}
          onSave={guardarDireccion}
          editando={!!editandoDireccionId}
        />
      )}
    </div>

    <footer className="w-full py-6 border-t border-gray-300 text-center mt-8">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
      </div>
    </footer>
  </div>
);



}

function FormularioDireccion({ paises, estados, direccion, onChange, onPaisChange, onEstadoChange, onCancel, onSave, editando }) {
  return (
    <div className="space-y-6 border border-gray-300 rounded-md p-6 bg-white">
      <div className="grid md:grid-cols-3 gap-4">
        <CampoSelect label="País" name="paisCodigo" value={direccion.paisCodigo} onChange={onPaisChange} opciones={paises.map(p => ({ value: p.codigo, label: p.nombre }))} />
        <CampoSelect label="Estado" name="estado" value={direccion.estado} onChange={onEstadoChange} opciones={estados.map(e => ({ value: e, label: e }))} disabled={!direccion.paisCodigo} />
        <Campo label="Ciudad" name="ciudad" value={direccion.ciudad} onChange={onChange} required />
        <Campo label="Código Postal" name="cp" value={direccion.cp} onChange={onChange} required />
        <Campo label="Calle y número" name="calle" value={direccion.calle} onChange={onChange} required className="md:col-span-2" />
        <Campo label="Referencia (opcional)" name="referencia" value={direccion.referencia} onChange={onChange} className="md:col-span-3" />
        <Campo label="Teléfono de contacto" name="telefono_contacto" value={direccion.telefono_contacto} onChange={onChange} required className="md:col-span-2" />
        <Campo label="Nombre (ej. Casa, Oficina)" name="nombre" value={direccion.nombre} onChange={onChange} required />
      </div>
      <div className="flex gap-4 mt-4">
        <button onClick={onSave} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">
          {editando ? 'Actualizar dirección' : 'Guardar dirección'}
        </button>
        <button onClick={onCancel} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400 transition">
          Cancelar
        </button>
      </div>
      
    </div>
  );
}

function Campo({ label, name, value, onChange, required = false, className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm text-gray-600 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        className="w-full border-b border-gray-400 bg-transparent px-2 py-2 text-gray-800 focus:outline-none focus:border-[#a16207]"
      />
    </div>
  );
}

function CampoSelect({ label, name, value, onChange, opciones, required = false, disabled = false }) {
  return (
    <div className="relative">
      <label className="text-sm text-gray-700 mb-1 block">{label}</label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="appearance-none w-full border-b border-gray-400 bg-transparent px-2 py-2 pr-8 text-gray-800 focus:outline-none focus:border-[#a16207]"
      >
        <option value="">Selecciona {label.toLowerCase()}</option>
        {opciones.map((op, i) => (
          <option key={i} value={op.value}>{op.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-8 text-gray-600 text-sm">▼</div>

      
    </div>
  );
}
