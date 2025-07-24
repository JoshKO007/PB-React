// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import emailjs from '@emailjs/browser';
import {
  Home, Image as ImageIcon, Video, ShoppingBag, Brush, User,
  Mail, LogIn, UserPlus, Settings, LogOut, Eye, KeyRound,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

const productos = [
  { titulo: 'Cuadro “Raíz de vida”', descripcion: 'Acrílico sobre lienzo. 60x80 cm.', imagen: '/producto1.jpg', precio: '$1200 MXN' },
  { titulo: 'Obra “Aurora interna”', descripcion: 'Mixta sobre papel reciclado. 50x70 cm.', imagen: '/producto2.jpg', precio: '$900 MXN' },
  { titulo: 'Serie “Elementos”', descripcion: 'Serie de 3 piezas. Técnica mixta.', imagen: '/producto3.jpg', precio: '$2100 MXN' }
];

const Notification = ({ type, message, onClose }) => {
  const bgColor = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700'
  };

  const icon = {
    success: <CheckCircle className="mr-2" />, error: <XCircle className="mr-2" />, warning: <AlertCircle className="mr-2" />
  };

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ duration: 0.3 }} className={`fixed top-4 right-4 border-l-4 ${bgColor[type]} p-4 rounded shadow-lg max-w-sm z-50 flex items-start`}>
      <div className="flex-shrink-0">{icon[type]}</div>
      <div className="ml-3"><p className="text-sm font-medium">{message}</p></div>
      <button onClick={onClose} className="ml-auto pl-3 text-gray-500 hover:text-gray-700">&times;</button>
    </motion.div>
  );
};

export default function App() {
  const [hovered, setHovered] = useState(null);
  const [index, setIndex] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [progresoEnvio, setProgresoEnvio] = useState(0);
  const userMenuTimeout = useRef(null);
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [tamano, setTamano] = useState('');
  const [tecnica, setTecnica] = useState('');
  const [antiguedad, setAntiguedad] = useState('');
  const [detalles, setDetalles] = useState('');
  const fileInputRef = useRef(null);
  const [imagenesAdicionales, setImagenesAdicionales] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [correoContacto, setCorreoContacto] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [notifications, setNotifications] = useState([]);

  const TELEGRAM_BOT_TOKEN = "8434892736:AAFGF8N1zff5yge2rj0eEyZXadZ7twq3F9s";
  const TELEGRAM_CHAT_ID = "5308808183";

  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % productos.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('sesionActiva'));
    if (sesion?.id && sesion.id !== usuarioActivo?.id) {
      setUsuarioActivo(sesion);
    }
  }, []);

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
 

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

const subirAFormData = async (file, index, total) => {
  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("photo", file);
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    body: form
  });
  setProgresoEnvio(Math.round(((index + 1) / total) * 100)); // Actualiza el porcentaje
  return res;
};


const handleEnviar = async () => {
  if (!correoContacto || !telefonoContacto || !selectedImage) {
    addNotification('error', 'Completa los campos y selecciona una imagen.');
    return;
  }

  setEnviandoCorreo(true);
  setProgresoEnvio(1);
  let progresoSimulado = 1;

  const intervalo = setInterval(() => {
    progresoSimulado += 5;
    setProgresoEnvio(Math.min(progresoSimulado, 95));
  }, 200);

  try {
    const mensaje = `🖼 Nueva solicitud de restauración:\n\n📨 Correo: ${correoContacto}\n📞 Teléfono: ${telefonoContacto}\n🎨 Título: ${titulo}\n📐 Tamaño: ${tamano}\n🧵 Técnica: ${tecnica}\n📆 Antigüedad: ${antiguedad}\n📄 Detalles: ${detalles}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: mensaje })
    });

    const totalImagenes = 1 + Math.min(imagenesAdicionales.length, 4);
    await subirAFormData(selectedImage);

    for (let i = 0; i < Math.min(imagenesAdicionales.length, 4); i++) {
      await subirAFormData(imagenesAdicionales[i]);
    }

    clearInterval(intervalo);
    setProgresoEnvio(100);

    addNotification('success', 'Solicitud enviada por Telegram correctamente.');
    setMostrarModal(false);
    setSelectedImage(null);
    setImagenesAdicionales([]);
    setTitulo('');
    setTamano('');
    setTecnica('');
    setAntiguedad('');
    setDetalles('');
    setCorreoContacto('');
    setTelefonoContacto('');
  } catch (error) {
    clearInterval(intervalo);
    console.error('Error al enviar por Telegram:', error);
    addNotification('error', 'Error al enviar por Telegram. Intenta nuevamente.');
  } finally {
    setTimeout(() => {
      setEnviandoCorreo(false);
      setProgresoEnvio(0);
    }, 1000);
  }
};


  const handleNuevaImagen = (nuevaImg) => {
    if (selectedImage) {
      setImagenesAdicionales((prev) => [...prev, selectedImage].slice(-5));
    }
    setSelectedImage(nuevaImg);
  };

  const handleAnterior = () => {
    if (imagenesAdicionales.length === 0) return;
    const anterior = imagenesAdicionales[imagenesAdicionales.length - 1];
    const nuevas = imagenesAdicionales.slice(0, -1);
    setImagenesAdicionales([selectedImage, ...nuevas]);
    setSelectedImage(anterior);
  };

  const handleSiguiente = () => {
    if (imagenesAdicionales.length === 0) return;
    const siguiente = imagenesAdicionales[0];
    const nuevas = imagenesAdicionales.slice(1);
    setImagenesAdicionales([...nuevas, selectedImage]);
    setSelectedImage(siguiente);
  };

  const configurar = () => {
    navigate('/configuracion');
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
  
  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      localStorage.removeItem('sesionActiva');
      setUsuarioActivo(null);
      setCerrandoSesion(false);
      navigate('/');
    }, 5000);
  };

  return (

    
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333] font-sans flex flex-col items-center">
      {/* Notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

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


      <main className="w-full max-w-6xl px-4 py-8 flex flex-col gap-10 items-center text-[#333]">
        {/* Introducción */}
        <section className="text-center">
          <h2 className="text-3xl font-bold text-[#a16207] mb-2">Restauración de obras</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            ¿Tienes una pintura dañada o antigua que deseas restaurar? Sube varias imágenes claras desde distintos ángulos y cuéntanos los detalles, para que la artista pueda ayudarte a revivirla.
          </p>
        </section>

        {/* Imagen + formulario */}
        <section className="w-full flex flex-col sm:flex-row gap-6 bg-white rounded-xl p-6 border shadow-md">
          {/* Contenedor de imagen principal + miniaturas */}
          <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
            <div className="relative w-[420px] h-[420px] group">
              <div
                className="w-full h-full border border-dashed border-gray-400 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length > 0) {
                    setSelectedImage(e.dataTransfer.files[0]);
                  }
                }}
              >
                {selectedImage ? (
                  <img src={URL.createObjectURL(selectedImage)} alt="Principal" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-sm text-gray-500 px-4">
                    <ImageIcon size={48} className="mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">Haz clic o arrastra una imagen aquí</p>
                    <p className="text-xs text-gray-400">Sube al menos 2 imágenes desde distintos ángulos</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files.length > 0) setSelectedImage(e.target.files[0]);
                  }}
                />
              </div>

              {selectedImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (imagenesAdicionales.length > 0) {
                      const [nuevaPrincipal, ...resto] = imagenesAdicionales;
                      setSelectedImage(nuevaPrincipal);
                      setImagenesAdicionales(resto);
                    } else {
                      setSelectedImage(null);
                    }
                  }}
                  className="absolute top-0 right-0 text-gray-500 bg-white/70 rounded-bl px-2 py-0.5 text-lg hover:text-gray-700 transition"
                  title="Eliminar imagen principal"
                >
                  ×
                </button>
              )}

              {imagenesAdicionales.length > 0 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const anterior = imagenesAdicionales[imagenesAdicionales.length - 1];
                      const nuevas = imagenesAdicionales.slice(0, -1);
                      setImagenesAdicionales([selectedImage, ...nuevas]);
                      setSelectedImage(anterior);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow hover:bg-white z-10"
                  >
                    ←
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const siguiente = imagenesAdicionales[0];
                      const nuevas = imagenesAdicionales.slice(1);
                      setImagenesAdicionales([...nuevas, selectedImage]);
                      setSelectedImage(siguiente);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow hover:bg-white z-10"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            <div className="w-[420px] flex gap-2 overflow-x-auto no-scrollbar mt-1">
              {imagenesAdicionales.map((img, i) => (
                <div key={i} className="relative w-16 h-16 border rounded overflow-hidden flex-shrink-0">
                  <img src={URL.createObjectURL(img)} alt={`extra-${i}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImagenesAdicionales(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0 right-0 text-white bg-red-500 rounded-bl px-1 text-xs hover:bg-red-600"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              ))}

              {imagenesAdicionales.length < 4 && (
                <>
                  <label
                    htmlFor="extraImagenInput"
                    className="w-16 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-600 transition flex-shrink-0"
                  >
                    <span className="text-xl font-bold">+</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    id="extraImagenInput"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files.length > 0) {
                        const nueva = e.target.files[0];
                        setImagenesAdicionales(prev => [...prev, nueva].slice(0, 4));
                      }
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Formulario */}
          <div className="flex-1 flex flex-col gap-4">
            <input type="text" placeholder="Título de la obra" className="w-full border rounded px-3 py-2" value={titulo} onChange={e => setTitulo(e.target.value)} />
            <input type="text" placeholder="Tamaño aproximado" className="w-full border rounded px-3 py-2" value={tamano} onChange={e => setTamano(e.target.value)} />
            <input type="text" placeholder="Técnica / Material" className="w-full border rounded px-3 py-2" value={tecnica} onChange={e => setTecnica(e.target.value)} />
            <input type="text" placeholder="Antigüedad aproximada" className="w-full border rounded px-3 py-2" value={antiguedad} onChange={e => setAntiguedad(e.target.value)} />
            <textarea rows="3" placeholder="Detalles específicos" className="w-full border rounded px-3 py-2" value={detalles} onChange={e => setDetalles(e.target.value)} />
            <button onClick={() => setMostrarModal(true)} className="mt-4 bg-[#a16207] text-white py-2 rounded hover:bg-[#875507] transition text-center">
              Enviar solicitud a la artista
            </button>
          </div>
        </section>

        {/* Modal de contacto */}
       {mostrarModal && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 relative">
      <h3 className="text-xl font-bold text-[#a16207] mb-4">Información de contacto</h3>
      <p className="text-sm text-gray-600 mb-4">Por favor, proporciona tu correo electrónico y número de teléfono. Se utilizarán únicamente para contactarte y ofrecerte un presupuesto.</p>

      <input
        type="email"
        placeholder="Correo electrónico"
        className="w-full mb-3 border rounded px-3 py-2"
        value={correoContacto}
        onChange={(e) => setCorreoContacto(e.target.value)}
      />
      <input
        type="tel"
        placeholder="Número de teléfono"
        className="w-full mb-4 border rounded px-3 py-2"
        value={telefonoContacto}
        onChange={(e) => setTelefonoContacto(e.target.value)}
      />

      {/* Barra de carga que aparece durante el envío */}
      {enviandoCorreo && (
        <div className="w-full mt-4">
          <p className="text-sm text-gray-600">Por favor, espera... estamos enviando tu solicitud.</p>
          <div className="w-full bg-gray-300 h-2 rounded-full mt-2">
            <div
              className="h-2 bg-[#a16207] rounded-full"
              style={{ width: `${progresoEnvio}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">{progresoEnvio}%</p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={() => setMostrarModal(false)} className="px-4 py-2 rounded border text-gray-600 hover:bg-gray-100">
          Cancelar
        </button>
        <button 
          onClick={handleEnviar} 
          className="px-4 py-2 rounded bg-[#a16207] text-white hover:bg-[#875507]"
          disabled={enviandoCorreo} // Deshabilita el botón mientras se está enviando
        >
          {enviandoCorreo ? "Enviando..." : "Confirmar envío"}
        </button>
      </div>
    </div>
  </div>
)}

      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}