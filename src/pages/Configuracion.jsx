import {
  User, Mail, Phone, Calendar, Info, Settings, MapPin, Trash2, Edit2,
  Eye, EyeOff, Home, ImageIcon, Video, Brush, ShoppingBag, LogOut, LogIn, UserPlus
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Country, State, City } from 'country-state-city';
import toast, { Toaster } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import React from 'react'; // Asegúrate de tener esta importación
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import sha256 from 'crypto-js/sha256';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from "react-router-dom";


const supabase = createClient(
  'https://ousgktyljynqzrnafoqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE'
);

export default function ConfiguracionUsuario() {
  const navigate = useNavigate();
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [datos, setDatos] = useState({
    nombre: '', apellido: '', email: '', telefono: '', usuario: '',
    nacimiento: '', genero: '', bio: ''
  });
  
  const [categoria, setCategoria] = useState('perfil');
  const [direcciones, setDirecciones] = useState([]);
  const [nuevaDireccion, setNuevaDireccion] = useState(null);
  const [editandoDireccionId, setEditandoDireccionId] = useState(null);
  const [paises, setPaises] = useState([]);
  const [estados, setEstados] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [contrasena, setContrasena] = useState('');
  const userMenuTimeout = useRef(null);
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hovered, setHovered] = useState(null);
    const handleUserMouseEnter = () => {
  clearTimeout(userMenuTimeout.current);
  setShowUserMenu(true);
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


  const configurar = () => {
    navigate('/configuracion');
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

  const actualizarContrasena = async () => {
  if (!usuarioActivo) return;

  if (contrasena.length < 6) {
    toast.error('La contraseña debe tener al menos 6 caracteres');
    return;
  }

  if (contrasena !== confirmarContrasena) {
    toast.error('Las contraseñas no coinciden');
    return;
  }

  const hashedPassword = sha256(contrasena).toString();

  const { error } = await supabase
    .from('usuarios')
    .update({ password: hashedPassword })
    .eq('id', usuarioActivo.id);

  if (error) {
    toast.error('Error al actualizar la contraseña');
    console.error(error);
    return;
  }

  toast.success('Contraseña actualizada correctamente');
};

useEffect(() => {
  try {
    const raw = localStorage.getItem('sesionActiva');
    const sesion = raw ? JSON.parse(raw) : null;

    // ✅ Verifica que usuarioActivo esté vacío antes de setearlo
    if (sesion?.id && !usuarioActivo?.id) {
      setUsuarioActivo(sesion);
      setDatos({ ...sesion, nacimiento: '', genero: '', bio: '' });
      cargarDirecciones(sesion.id);
      cargarDatosComplementarios(sesion.id);
    }
  } catch (err) {
    console.error("Error al cargar sesión:", err);
    localStorage.removeItem('sesionActiva');
  }

  setPaises(Country.getAllCountries());
}, [usuarioActivo]); // 👈 esto también ayuda



const CustomInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    onClick={onClick}
    ref={ref}
    type="button"
    className="w-full h-[48px] p-3 border border-gray-300 rounded-md shadow-sm flex items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-[#a16207]/50"
  >
    <span className={`flex-1 truncate ${!value ? 'text-gray-400' : 'text-black'}`}>
      {value || placeholder}
    </span>
    <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
  </button>
));



  const cargarDirecciones = async (userId) => {
    const { data, error } = await supabase
      .from('direcciones_usuarios')
      .select('*')
      .eq('id_usuario', userId);
    if (!error) setDirecciones(data);
  };
  
  const guardarPerfil = async () => {
  if (!usuarioActivo) return;

  const { nombre, apellido, email, telefono, usuario, nacimiento, genero, bio } = datos;
  const nacimientoValido = nacimiento && nacimiento !== '' ? nacimiento : null;

  // 1. Actualiza la tabla usuarios
  const { error: errorUsuario } = await supabase
    .from('usuarios')
    .update({ nombre, apellido, email, telefono, usuario })
    .eq('id', usuarioActivo.id);

  if (errorUsuario) {
    toast.error('Error al actualizar datos del usuario');
    console.error(errorUsuario);
    return;

    
  }

  // 2. Intenta actualizar datos_complementarios
  const { data: updateData, error: updateError } = await supabase
    .from('datos_complementarios')
    .update({
      nacimiento: nacimientoValido,
      genero,
      bio,
      updated_at: new Date()
    })
    .eq('id_usuario', usuarioActivo.id)
    .select(); // NO .single()

  if (updateError) {
    toast.error('Error al actualizar datos complementarios');
    console.error(updateError);
    return;
  }

  // 3. Si no se actualizó nada (porque no existía), hacemos insert
  if (!updateData || updateData.length === 0) {
    const { error: insertError } = await supabase
      .from('datos_complementarios')
      .insert([{
        id_usuario: usuarioActivo.id,
        nacimiento: nacimientoValido,
        genero,
        bio
      }]);

    if (insertError) {
      toast.error('Error al insertar datos complementarios');
      console.error(insertError);
      return;
    }
  }

  

  // 4. Recargar usuario actualizado desde tabla usuarios (cambiar .single() a .maybeSingle())
  const { data: usuarioActualizado, error: errorFinal } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', usuarioActivo.id)
    .maybeSingle(); // <-- ✅ para evitar PGRST116

  if (errorFinal) {
    toast.error('No se pudo actualizar sesión');
    console.error(errorFinal);
    return;
  }

  if (!usuarioActualizado) {
    toast.error('No se encontró el usuario actualizado');
    return;
  }

  if (usuarioActualizado?.id !== usuarioActivo?.id) {
  setUsuarioActivo(usuarioActualizado);
  localStorage.setItem('sesionActiva', JSON.stringify(usuarioActualizado));
}

  toast.success('Perfil actualizado correctamente');

};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatos(prev => ({ ...prev, [name]: value }));
  };

  const handleDireccionChange = (e) => {
    const { name, value } = e.target;
    setNuevaDireccion(prev => ({ ...prev, [name]: value }));
  };

  const handlePaisChange = (e) => {
    const code = e.target.value;
    const pais = paises.find(p => p.isoCode === code);
    const estadosPais = State.getStatesOfCountry(code);
    setEstados(estadosPais);
    setCiudades([]);
    setNuevaDireccion(prev => ({
      ...prev,
      pais: pais?.name,
      paisCode: code,
      estado: '',
      estadoCode: '',
      ciudad: ''
    }));
  };

  const cargarDatosComplementarios = async (userId) => {
    const { data, error } = await supabase
        .from('datos_complementarios')
        .select('*')
        .eq('id_usuario', userId)
        .maybeSingle(); 

    if (!error && data) {
        setDatos(prev => ({
        ...prev,
        nacimiento: data.nacimiento || '',
        genero: data.genero || '',
        bio: data.bio || ''
        }));
    }
    };


  const handleEstadoChange = (e) => {
    const code = e.target.value;
    const estado = estados.find(s => s.isoCode === code);
    const ciudadesEstado = City.getCitiesOfState(nuevaDireccion.paisCode, code);
    setCiudades(ciudadesEstado);
    setNuevaDireccion(prev => ({
      ...prev,
      estado: estado?.name,
      estadoCode: code,
      ciudad: ''
    }));
  };

  const handleCiudadChange = (e) => {
    const ciudad = e.target.value;
    setNuevaDireccion(prev => ({ ...prev, ciudad }));
  };

  const guardarDireccion = async () => {
    if (!nuevaDireccion.nombre || nuevaDireccion.nombre.trim() === '') {
        toast.error('Debes ingresar un nombre para la dirección');
        return;
    }
    if (!usuarioActivo || !nuevaDireccion) return;
    const direccionAGuardar = {
      id_usuario: usuarioActivo.id,
      pais: nuevaDireccion.pais,
      estado: nuevaDireccion.estado,
      ciudad: nuevaDireccion.ciudad,
      cp: nuevaDireccion.cp,
      calle: nuevaDireccion.calle,
      referencia: nuevaDireccion.referencia,
      telefono_contacto: nuevaDireccion.telefono_contacto,
      nombre: nuevaDireccion.nombre
    };

    if (editandoDireccionId) {
      const { data, error } = await supabase
        .from('direcciones_usuarios')
        .update(direccionAGuardar)
        .eq('id', editandoDireccionId)
        .select();

      if (!error) {
        setDirecciones(prev =>
          prev.map(dir => dir.id === editandoDireccionId ? data[0] : dir)
        );
      } else {
        console.error(error);
      }
    } else {
      const { data, error } = await supabase
        .from('direcciones_usuarios')
        .insert(direccionAGuardar)
        .select();

      if (!error) {
        setDirecciones(prev => [...prev, ...data]);
      } else {
        console.error(error);
      }
    }

    setNuevaDireccion(null);
    setEditandoDireccionId(null);
  };

  const eliminarDireccion = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta dirección?')) return;
    const { error } = await supabase
      .from('direcciones_usuarios')
      .delete()
      .eq('id', id);

    if (!error) {
      setDirecciones(prev => prev.filter(dir => dir.id !== id));
    } else {
      console.error(error);
    }
  };

  const categorias = [
    { id: 'perfil', label: 'Perfil', icon: <User size={18} /> },
    { id: 'cuenta', label: 'Cuenta', icon: <Settings size={18} /> },
    { id: 'direccion', label: 'Direcciones', icon: <MapPin size={18} /> },
  ];

  const renderCampos = () => {
    switch (categoria) {
case 'perfil':
  return (
    <div className="space-y-6">
      {/* Nombre, Apellido, Email, Usuario */}
      <div className="grid md:grid-cols-2 gap-6">
        <Campo label="Nombre(s)" name="nombre" value={datos.nombre} onChange={handleChange} />
        <Campo label="Apellido(s)" name="apellido" value={datos.apellido} onChange={handleChange} />
        <Campo label="Correo electrónico" name="email" value={datos.email} onChange={handleChange} />
        <Campo label="Nombre de usuario" name="usuario" value={datos.usuario} onChange={handleChange} />
      </div>

      {/* Teléfono, Fecha de nacimiento, Género */}
      <div className="grid md:grid-cols-3 gap-6">
        <Campo label="Teléfono" name="telefono" value={datos.telefono} onChange={handleChange} />

        <div>
          <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">Fecha de nacimiento</label>
          <DatePicker
            selected={
              datos.nacimiento && !isNaN(new Date(datos.nacimiento).getTime())
                ? new Date(datos.nacimiento)
                : null
            }
            onChange={(date) =>
              setDatos(prev => ({
                ...prev,
                nacimiento: date?.toISOString().split('T')[0] || ''
              }))
            }
            dateFormat="dd 'de' MMMM 'de' yyyy"
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            maxDate={new Date()}
            placeholderText="Selecciona tu fecha"
            locale={es}
            customInput={<CustomInput />}
          />
        </div>

        <Campo label="Género" name="genero" value={datos.genero} onChange={handleChange} />
      </div>

      {/* Biografía */}
      <div>
        <Campo label="Biografía" name="bio" value={datos.bio} onChange={handleChange} textarea />
      </div>

      {/* Botón guardar */}
      <div className="mt-4">
        <button
          onClick={guardarPerfil}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Guardar perfil
        </button>
      </div>
    </div>
  );

case 'cuenta':
  return (
    <div className="space-y-6 max-w-md">
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
          onClick={() => setMostrarContrasena(prev => !prev)}
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
          onClick={() => setMostrarConfirmacion(prev => !prev)}
          className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
        >
          {mostrarConfirmacion ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <button
        onClick={actualizarContrasena}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
      >
        Guardar contraseña
      </button>
    </div>
  );

      case 'direccion':
        return (
          <div className="space-y-4">
            {direcciones.map((dir, i) => (
              <div key={i} className="flex items-start gap-4 p-4 border border-gray-300 rounded-md bg-white shadow-sm">
                <MapPin size={24} className="text-blue-600 mt-1" />
                <div className="flex-1">
                  <p className="text-base font-bold text-[#a16207]">{dir.nombre}</p>
                  <p className="font-semibold">{dir.calle}, {dir.ciudad}, {dir.estado}</p>
                  <p className="text-sm text-gray-600">{dir.pais} · CP {dir.cp}</p>
                  {dir.referencia && <p className="text-sm text-gray-500 italic">"{dir.referencia}"</p>}
                  <p className="text-sm text-gray-600 mt-1">Tel: {dir.telefono_contacto}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const paisObj = paises.find(p => p.name === dir.pais);
                      const estadoObj = paisObj ? State.getStatesOfCountry(paisObj.isoCode).find(s => s.name === dir.estado) : null;
                      const ciudadesEstado = (paisObj && estadoObj) ? City.getCitiesOfState(paisObj.isoCode, estadoObj.isoCode) : [];

                      setEstados(State.getStatesOfCountry(paisObj?.isoCode || ''));
                      setCiudades(ciudadesEstado);

                      setNuevaDireccion({
                        ...dir,
                        paisCode: paisObj?.isoCode || '',
                        estadoCode: estadoObj?.isoCode || ''
                      });
                      setEditandoDireccionId(dir.id);
                    }}
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                   <Edit2 size={14} />  Editar
                  </button>
                  <button
                    onClick={() => eliminarDireccion(dir.id)}
                    className="text-red-600 hover:underline text-sm flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}

            {!nuevaDireccion ? (
              <button
                onClick={() => {
                    setNuevaDireccion({
                    nombre: '',
                    pais: '', estado: '', ciudad: '', cp: '', calle: '', referencia: '',
                    telefono_contacto: datos.telefono || ''
                    });
                  setEditandoDireccionId(null);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                <MapPin size={16} /> Agregar nueva dirección
              </button>
            ) : (
              <div className="space-y-6 border border-gray-300 rounded-md p-6 bg-white">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="text-sm text-gray-700 mb-1 block">País</label>
                    <select
                      value={nuevaDireccion.paisCode || ''}
                      onChange={handlePaisChange}
                      className="appearance-none w-full border-b border-gray-400 bg-transparent px-2 py-2 pr-8 text-gray-800 focus:outline-none focus:border-[#a16207]"
                    >
                      <option value="">Selecciona un país</option>
                      {paises.map(p => (
                        <option key={p.isoCode} value={p.isoCode}>{p.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2 top-8 text-gray-600 text-sm">▼</div>
                  </div>

                  <div className="relative">
                    <label className="text-sm text-gray-700 mb-1 block">Estado</label>
                    <select
                      value={nuevaDireccion.estadoCode || ''}
                      onChange={handleEstadoChange}
                      className="appearance-none w-full border-b border-gray-400 bg-transparent px-2 py-2 pr-8 text-gray-800 focus:outline-none focus:border-[#a16207]"
                    >
                      <option value="">Selecciona un estado</option>
                      {estados.map(e => (
                        <option key={e.isoCode} value={e.isoCode}>{e.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2 top-8 text-gray-600 text-sm">▼</div>
                  </div>

                  <div className="relative">
                    <label className="text-sm text-gray-700 mb-1 block">Ciudad</label>
                    <select
                      value={nuevaDireccion.ciudad || ''}
                      onChange={handleCiudadChange}
                      className="appearance-none w-full border-b border-gray-400 bg-transparent px-2 py-2 pr-8 text-gray-800 focus:outline-none focus:border-[#a16207]"
                    >
                      <option value="">Selecciona una ciudad</option>
                      {ciudades.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2 top-8 text-gray-600 text-sm">▼</div>
                  </div>

                  <div className="md:col-span-1">
                    <Campo label="Código Postal" name="cp" value={nuevaDireccion.cp} onChange={handleDireccionChange} />
                  </div>
                  <div className="md:col-span-2">
                    <Campo label="Calle y número" name="calle" value={nuevaDireccion.calle} onChange={handleDireccionChange} />
                  </div>
                  <div className="md:col-span-2">
                    <Campo label="Referencia" name="referencia" value={nuevaDireccion.referencia} onChange={handleDireccionChange} />
                  </div>
                  <div className="md:col-span-1">
                    <Campo label="Teléfono de contacto" name="telefono_contacto" value={nuevaDireccion.telefono_contacto} onChange={handleDireccionChange} />
                  </div>
                  <div className="md:col-span-3">
                    <Campo label="Nombre de la dirección (ej. Casa, Oficina)" name="nombre" value={nuevaDireccion.nombre} onChange={handleDireccionChange} />
                </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={guardarDireccion}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
                  >
                    {editandoDireccionId ? 'Actualizar dirección' : 'Guardar dirección'}
                  </button>
                  <button
                    onClick={() => {
                      setNuevaDireccion(null);
                      setEditandoDireccionId(null);
                    }}
                    className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
    
  };

  return (
    <>
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
          onTouchStart={() => setShowUserMenu(!showUserMenu)} // Añade esto para móviles
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

{cerrandoSesion && (
  <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
    <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
  </div>
)}


    <div className="min-h-screen bg-[#f9f4ef] flex">
    <Toaster position="top-right" reverseOrder={false} />
      <aside className="w-64 border-r border-gray-300 bg-white/70 backdrop-blur-md py-6 px-4">
        <h2 className="text-xl font-semibold mb-6 text-[#a16207]">Configuración</h2>
        <nav className="space-y-4">
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoria(cat.id)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-md transition ${categoria === cat.id ? 'bg-[#a16207]/10 text-[#a16207]' : 'hover:bg-gray-100'}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg p-8"
        >
          <h3 className="text-2xl font-bold mb-6 text-[#a16207]">
            {categorias.find(c => c.id === categoria)?.label}
          </h3>
          <div className="space-y-6">
            {renderCampos()}
          </div>
        </motion.div>
      </main>
    </div>
    </>
  );
}




function Campo({ label, name, value, onChange, icon, type = 'text', textarea = false }) {
  return (
    <div>
      <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
        {icon} {label}
      </label>
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
