// src/Favoritos.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  LogOut,
  KeyRound,
  Heart,
  Trash2,
  BadgeDollarSign,
  Tag,
  X,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

/* ============================================================
   Catálogo base (fallback). Alineado con el JSON de Tienda.
   ============================================================ */
const PRODUCTOS_BASE = [
  { id: "p1", titulo: "Raíz de vida", descripcion: "Acrílico sobre lienzo. 60x80 cm.", descripcionDetallada: "Obra que explora la relación entre lo orgánico y lo ritual. Capas de acrílico veladas con pinceladas gestuales. Lienzo de algodón 380 g/m², bastidor de pino con acabado mate. Incluye sistema de colgado.", imagenes: ["/obras/obra3.jpg","/producto1b.jpg","/producto1c.jpg"], precio: 1200, moneda: "MXN", descuento: 10, etiquetas: ["acrílico","naturaleza"], disponible: true, tiempoEntrega: "Listo para envío", destacado: true, bajoPedido: false },
  { id: "p2", titulo: "Aurora interna", descripcion: "Mixta sobre papel reciclado. 50x70 cm.", descripcionDetallada: "Técnica mixta con pigmentos y tintas sobre papel reciclado libre de ácido (300 g). La pieza combina texturas granulosas y transparencias para sugerir una luz interior.", imagenes: ["/producto2.jpg","/producto2b.jpg"], precio: 900, moneda: "MXN", descuento: 0, etiquetas: ["mixta","onírico"], disponible: true, tiempoEntrega: "Listo para envío", destacado: true, bajoPedido: false },
  { id: "p3", titulo: "Serie Elementos (3 piezas)", descripcion: "Serie de 3 piezas. Técnica mixta.", descripcionDetallada: "Tríptico que dialoga con los cuatro elementos a través de tres abstracciones. Base acrílica, tinta y grafito sellado con barniz satinado. Se puede instalar en horizontal o vertical.", imagenes: ["/producto3.jpg","/producto3b.jpg"], precio: 2100, moneda: "MXN", descuento: 15, etiquetas: ["serie","mixta"], disponible: true, tiempoEntrega: "Hecho bajo pedido (2-3 semanas)", destacado: true, bajoPedido: true },
  { id: "p4", titulo: "Cenit marino", descripcion: "Óleo sobre lienzo. 40x60 cm.", descripcionDetallada: "Pincelada suelta con veladuras de óleo para un efecto de profundidad acuosa. Lienzo tensado en bastidor de pino. Borde pintado para montaje sin marco.", imagenes: ["/producto4.jpg","/producto4b.jpg"], precio: 1500, moneda: "MXN", descuento: 0, etiquetas: ["óleo","mar"], disponible: true, tiempoEntrega: "Listo para envío", destacado: false, bajoPedido: false },
  { id: "p5", titulo: "Bosque de susurros", descripcion: "Acuarela. 30x40 cm.", descripcionDetallada: "Acuarela sobre papel 100% algodón prensado en frío. Paleta fría con detalles húmedo-sobre-húmedo que enfatiza atmósferas y profundidad.", imagenes: ["/producto5.jpg","/producto5b.jpg"], precio: 600, moneda: "MXN", descuento: 5, etiquetas: ["acuarela","paisaje"], disponible: true, tiempoEntrega: "Listo para envío", destacado: true, bajoPedido: false },
  { id: "p6", titulo: "Retrato en bruma", descripcion: "Mixta sobre madera. 60x60 cm.", descripcionDetallada: "Soporte de madera sellado y texturizado. Capas de acrílico y carbón para un gesto difuso que insinúa rostro. Barniz protector UV.", imagenes: ["/producto6.jpg","/producto6b.jpg"], precio: 1800, moneda: "MXN", descuento: 20, etiquetas: ["retrato","mixta"], disponible: true, tiempoEntrega: "Hecho bajo pedido (3 semanas)", destacado: true, bajoPedido: true },
  { id: "p7", titulo: "Geometría íntima", descripcion: "Tinta y acrílico. 50x50 cm.", descripcionDetallada: "Composición abstracta con módulos geométricos y veladuras. Base acrílica con intervenciones en tinta indeleble. Montaje recomendado flotado.", imagenes: ["/producto7.jpg","/producto7b.jpg"], precio: 1100, moneda: "MXN", descuento: 0, etiquetas: ["tinta","abstracto"], disponible: true, tiempoEntrega: "Listo para envío", destacado: false, bajoPedido: false },
  { id: "p8", titulo: "Luz de medianoche", descripcion: "Acrílico sobre lienzo. 70x90 cm.", descripcionDetallada: "Gran formato con capas espesas y raspados. Contrastes de azul profundo y toques nacarados. Ideal para muro principal.", imagenes: ["/producto8.jpg","/producto8b.jpg"], precio: 2500, moneda: "MXN", descuento: 12, etiquetas: ["acrílico","contemporáneo"], disponible: true, tiempoEntrega: "Hecho bajo pedido (4 semanas)", destacado: false, bajoPedido: true },
];

/* ======================= Utiles ======================= */
function formatoPrecio(valor, moneda) {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda || "MXN" }).format(valor);
  } catch {
    return `$${valor} ${moneda || "MXN"}`;
  }
}
function getPrecioFinal(precio, descuento = 0) {
  const pct = Math.max(0, Math.min(100, Number(descuento) || 0));
  return Math.round(precio * (1 - pct / 100) * 100) / 100;
}
function safeCartCount(cartArray) {
  return (cartArray || []).reduce((sum, it) => {
    const qty = Number.isFinite(Number(it?.cantidad)) ? Number(it.cantidad) : 1;
    return sum + Math.max(0, qty);
  }, 0);
}
function getCartKeyBySession(sesion) {
  return sesion?.id ? `carrito:${sesion.id}` : null;
}
function getFavsKeyBySession(sesion) {
  // Favoritos por usuario; si no hay sesión, usamos 'favoritos' (se migra al iniciar sesión)
  return sesion?.id ? `favoritos:${sesion.id}` : "favoritos";
}
function readFavsBySession(sesion) {
  try {
    const key = getFavsKeyBySession(sesion);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeFavsBySession(sesion, list) {
  const key = getFavsKeyBySession(sesion);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  // Notifica a otras partes de la app (misma pestaña)
  try {
    window.dispatchEvent(new CustomEvent("favs:changed", { detail: { key, list } }));
  } catch {}
  // Notifica a otras pestañas
  try {
    const bc = new BroadcastChannel("favs");
    bc.postMessage({ key, list });
    bc.close();
  } catch {}
}

/* ======================= Etiqueta ======================= */
function Etiqueta({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur bg-white/70 border-gray-200">
      <Tag size={12} /> {children}
    </span>
  );
}

/* ======================= Carrusel + QuickView ======================= */
function ImageCarousel({ images = [], title = "" }) {
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [direction, setDirection] = useState(0);

  const slides = (images || []).slice(0, 5);
  const len = slides.length || 1;

  useEffect(() => {
    if (!autoPlay || len <= 1) return;
    const id = setInterval(() => paginate(1), 9000);
    return () => clearInterval(id);
  }, [autoPlay, len]);

  const paginate = (dir) => { setDirection(dir); setIdx((i) => (i + dir + len) % len); };
  const prev = () => { setAutoPlay(false); paginate(-1); };
  const next = () => { setAutoPlay(false); paginate(1); };
  const goTo = (i) => { setAutoPlay(false); setDirection(i > idx ? 1 : -1); setIdx(i); };

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };
  const current = slides[idx];

  return (
    <div className="relative w-full select-none">
      <div className="relative w-full bg-gray-100 overflow-hidden flex items-center justify-center min-h-[240px]">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={current || idx}
            src={current || "/placeholder.jpg"}
            alt={`${title} ${idx + 1}`}
            className="w-full h-auto object-contain max-h-[60vh] sm:max-h-[80vh] mx-auto"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35 }}
            onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
          />
        </AnimatePresence>

        {len > 1 && (
          <>
            <button aria-label="Anterior" onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:shadow-md">
              <ChevronLeft size={18} />
            </button>
            <button aria-label="Siguiente" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:shadow-md">
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {len > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir a imagen ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-2.5 w-2.5 rounded-full border transition ${i === idx ? "bg-white border-white scale-110" : "bg-white/60 border-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickView({ open, onClose, producto, onAddCart }) {
  if (!open || !producto) return null;

  const tieneDescuento = (producto.descuento || 0) > 0;
  const precioFinal = getPrecioFinal(producto.precio, producto.descuento);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="relative w-full sm:max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden m-2 max-h-[92vh] overflow-y-auto scale-[0.92] sm:scale-100 origin-center"
        >
          <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow">
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-3 md:p-4 overflow-hidden">
              <ImageCarousel images={producto?.imagenes} title={producto?.titulo} />
            </div>

            <div className="flex flex-col max-h-[70vh] md:max-h-[85vh]">
              <div className="px-4 md:px-6 pt-4 md:pt-6 overflow-y-auto">
                <h3 className="text-lg md:text-2xl font-bold">{producto.titulo}</h3>
                <p className="mt-2 text-sm md:text-base text-gray-600">{producto.descripcion}</p>

                {producto.descripcionDetallada && (
                  <div className="mt-3 text-xs md:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {producto.descripcionDetallada}
                  </div>
                )}

                {/* Precio */}
                <div className="mt-4">
                  {tieneDescuento ? (
                    <>
                      <div className="text-xs text-gray-400 line-through">
                        {formatoPrecio(producto.precio, producto.moneda)}
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold">
                        {formatoPrecio(precioFinal, producto.moneda)}
                      </div>
                      <div className="text-sm text-rose-600 font-medium mt-0.5">
                        −{producto.descuento}% de descuento
                      </div>
                      <div className="text-[12px] text-gray-500 mt-1">No incluye impuestos</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl md:text-3xl font-bold">
                        {formatoPrecio(producto.precio, producto.moneda)}
                      </div>
                      <div className="text-[12px] text-gray-500 mt-1">No incluye impuestos</div>
                    </>
                  )}
                </div>

                <div className="mt-3 text-xs md:text-sm text-gray-500 inline-flex items-center gap-2">
                  <Clock size={14} /> {producto.tiempoEntrega}
                </div>

                {producto.etiquetas?.length > 0 && (
                  <div className="mt-3 md:mt-4 mb-5 md:mb-6 flex flex-wrap gap-2">
                    {producto.etiquetas.map((e) => (
                      <Etiqueta key={e}>{e}</Etiqueta>
                    ))}
                  </div>
                )}
              </div>

              {/* Botonera: se elimina “Añadir al carrito” */}
              <div className="sticky bottom-0 w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-4 bg-white/95 backdrop-blur border-t">
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => onAddCart(producto, 1, true)}
                    className="rounded-lg md:rounded-xl border px-3 py-2 md:px-4 md:py-3 font-semibold inline-flex items-center gap-2 text-sm md:text-base"
                  >
                    <BadgeDollarSign size={16} className="md:hidden" />
                    <BadgeDollarSign size={18} className="hidden md:inline" />
                    Comprar ahora
                  </button>
                  <button onClick={onClose} className="ml-auto rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 font-semibold text-gray-600 hover:text-red-600 text-sm md:text-base">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ======================= Página Favoritos ======================= */
export default function Favoritos() {
  const navigate = useNavigate();

  // --- Header / sesión ---
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const userMenuTimeout = useRef(null);

  // QuickView
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickProducto, setQuickProducto] = useState(null);

  // Productos (lee del mismo JSON externo de Tienda, con fallback)
  const [productos, setProductos] = useState(PRODUCTOS_BASE);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/productos.json", { cache: "no-store" });
        if (!res.ok) throw new Error("No JSON");
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length) setProductos(data);
      } catch {
        // fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cargar sesión
  useEffect(() => {
    try {
      const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
      setUsuarioActivo(sesion?.id ? sesion : null);
    } catch {
      setUsuarioActivo(null);
    }
  }, []);

  // Recalc contador cuando cambia sesión
  useEffect(() => {
    try {
      if (!usuarioActivo?.id) { setCartCount(0); return; }
      const key = getCartKeyBySession(usuarioActivo);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      setCartCount(safeCartCount(cart));
    } catch { setCartCount(0); }
  }, [usuarioActivo]);

  // Escuchar cambios storage (carrito) + sesión
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "sesionActiva") {
        try {
          const sesion = JSON.parse(e.newValue);
          setUsuarioActivo(sesion?.id ? sesion : null);
        } catch { setUsuarioActivo(null); }
        return;
      }
      if (usuarioActivo?.id) {
        const myKey = getCartKeyBySession(usuarioActivo);
        if (e.key === myKey) {
          try {
            const cart = JSON.parse(e.newValue || "[]");
            setCartCount(safeCartCount(cart));
          } catch { setCartCount(0); }
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [usuarioActivo]);

  // Focus sync
  useEffect(() => {
    const onFocus = () => {
      try {
        const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
        setUsuarioActivo(sesion?.id ? sesion : null);
        if (sesion?.id) {
          const key = getCartKeyBySession(sesion);
          const cart = JSON.parse(localStorage.getItem(key) || "[]");
          setCartCount(safeCartCount(cart));
        } else { setCartCount(0); }
      } catch { setUsuarioActivo(null); setCartCount(0); }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleUserMouseEnter = () => { clearTimeout(userMenuTimeout.current); setShowUserMenu(true); };
  const handleUserMouseLeave = () => { userMenuTimeout.current = setTimeout(() => setShowUserMenu(false), 300); };
  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("carrito"); // legacy
        const prev = JSON.parse(localStorage.getItem("sesionActiva"));
        if (prev?.id) {
          localStorage.removeItem(`carrito:${prev.id}`);
        }
      } catch {}
      localStorage.removeItem("sesionActiva");
      setUsuarioActivo(null);
      setCartCount(0);
      setCerrandoSesion(false);
      navigate("/");
    }, 5000);
  };

  const menu = [
    { label: "Inicio", icon: <Home size={28} />, onClick: () => navigate("/") },
    { label: "Galería", icon: <ImageIcon size={24} />, onClick: () => navigate("/galeria") },
    { label: "Videos", icon: <Video size={24} />, onClick: () => navigate("/videos") },
    { label: "Tienda", icon: <ShoppingBag size={24} />, onClick: () => navigate("/tienda") },
    { label: "Restauración", icon: <Brush size={24} />, onClick: () => navigate("/restauracion") },
    { label: "Contacto", icon: <Mail size={24} />, onClick: () => navigate("/contacto") },
  ];

  /* ======================= Favoritos (por usuario, sincronizados) ======================= */
  const [favs, setFavs] = useState([]);
  useEffect(() => {
    try {
      const current = readFavsBySession(usuarioActivo);
      // migración desde global si hay sesión y no tiene favs
      if ((usuarioActivo?.id) && (!current || current.length === 0)) {
        const legacy = JSON.parse(localStorage.getItem("favoritos") || "[]");
        if (legacy.length > 0) {
          writeFavsBySession(usuarioActivo, legacy);
          localStorage.removeItem("favoritos");
          setFavs(legacy);
          return;
        }
      }
      setFavs(current || []);
    } catch {
      setFavs([]);
    }
  }, [usuarioActivo]);

  // Escucha cambios de favoritos (misma pestaña + otras pestañas)
  useEffect(() => {
    const myKey = getFavsKeyBySession(usuarioActivo);

    const onStorage = (e) => {
      if (e.key === myKey) {
        try { setFavs(JSON.parse(e.newValue || "[]") || []); } catch { setFavs([]); }
      }
      if (e.key === "sesionActiva") {
        try {
          const ses = JSON.parse(e.newValue);
          setFavs(readFavsBySession(ses?.id ? ses : null));
        } catch {}
      }
    };

    const onLocalFavs = (e) => {
      if (e.detail?.key === myKey) setFavs(e.detail.list || []);
    };

    let bc;
    try {
      bc = new BroadcastChannel("favs");
      bc.onmessage = (msg) => {
        if (msg?.data?.key === myKey) setFavs(msg.data.list || []);
      };
    } catch {}

    window.addEventListener("storage", onStorage);
    window.addEventListener("favs:changed", onLocalFavs);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("favs:changed", onLocalFavs);
      try { bc && bc.close(); } catch {}
    };
  }, [usuarioActivo]);

  const saveFavs = (list) => {
    writeFavsBySession(usuarioActivo, list);
    setFavs(list);
  };

  /* ======================= Carrito ======================= */
  const addToCart = (producto, qty = 1, goCheckout = false) => {
    if (!usuarioActivo?.id) {
      navigate("/iniciar-sesion");
      return;
    }
    const key = getCartKeyBySession(usuarioActivo);
    const raw = localStorage.getItem(key);
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((i) => i.id === producto.id);
    if (existing) existing.cantidad += qty;
    else cart.push({
      id: producto.id,
      titulo: producto.titulo,
      precio: getPrecioFinal(producto.precio, producto.descuento),
      imagen: producto.imagenes?.[0],
      cantidad: qty
    });
    localStorage.setItem(key, JSON.stringify(cart));
    setCartCount(safeCartCount(cart));
    if (goCheckout) navigate("/carrito");
  };

  const removeFromCart = (productoId) => {
    if (!usuarioActivo?.id) return;
    const key = getCartKeyBySession(usuarioActivo);
    const raw = localStorage.getItem(key);
    const cart = raw ? JSON.parse(raw) : []; // ojo: no romper si no existe
    const next = cart.filter((i) => i.id !== productoId);
    localStorage.setItem(key, JSON.stringify(next));
    setCartCount(safeCartCount(next));
  };

  const isInCart = (productoId) => {
    if (!usuarioActivo?.id) return false;
    try {
      const key = getCartKeyBySession(usuarioActivo);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      return cart.some((i) => i.id === productoId);
    } catch { return false; }
  };

  /* ======================= Derivados ======================= */
  const favProductos = useMemo(() => {
    const catalog = productos?.length ? productos : PRODUCTOS_BASE;
    return favs
      .map((id) => catalog.find((p) => p.id === id))
      .filter(Boolean);
  }, [favs, productos]);

  /* ======================= Acciones UI ======================= */
  const onRemoveFav = (id) => saveFavs(favs.filter((f) => f !== id));
  const onClearAll = () => saveFavs([]);

  const openQuick = (p) => { setQuickProducto(p); setQuickOpen(true); };
  const closeQuick = () => { setQuickOpen(false); setQuickProducto(null); };

  /* ======================= Render ======================= */
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333] font-sans flex flex-col">
      {/* Overlay de cierre de sesión */}
      {cerrandoSesion && (
        <div className="fixed inset-0 bg-white/80 z-[10000] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#a16207]" />
          <p className="mt-4 text-[#a16207] font-semibold">Cerrando sesión...</p>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full text-center relative z-40 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md shadow-xl rounded-b-xl"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 relative z-40">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center w-full relative gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <img src="/logo.png" alt="Logo" className="h-14 sm:h-16" />
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

      {/* ================= CONTENIDO ================= */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full py-8 md:py-10">
        <div className="rounded-3xl border bg-white/70 backdrop-blur p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Heart className="text-rose-600" /> Favoritos
            </h1>
            {favProductos.length > 0 && (
              <div className="text-sm text-gray-600">{favProductos.length} artículo(s)</div>
            )}
          </div>

          {/* Acciones superiores */}
          {favProductos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={onClearAll}
                className="ml-auto rounded-full px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
              >
                <Trash2 size={16} /> Limpiar lista
              </button>
            </div>
          )}

          {/* Grid de favoritos (tarjetas a altura completa y secciones con min-height) */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {favProductos.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed bg-white/60 p-8 text-center text-gray-600">
                <p className="text-lg font-semibold">Tu lista de favoritos está vacía</p>
                <p className="text-sm mt-1">Explora la tienda y guarda piezas que te encanten.</p>
                <button
                  onClick={() => navigate("/tienda")}
                  className="mt-4 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
                >
                  Ir a la tienda
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {favProductos.map((p) => {
                  const precioFinal = getPrecioFinal(p.precio, p.descuento);
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.28 }}
                      className="group relative border rounded-2xl bg-white/80 shadow-sm overflow-hidden h-full flex flex-col"
                    >
                      {/* Imagen con altura fija para uniformidad */}
                      <button onClick={() => openQuick(p)} title="Ver detalles" className="relative">
                        <img
                          src={p.imagenes?.[0] || "/placeholder.jpg"}
                          alt={p.titulo}
                          className="h-56 w-full object-cover"
                          onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
                        />
                      </button>

                      {/* Contenido */}
                      <div className="p-4 flex-1 flex flex-col">
                        <button onClick={() => openQuick(p)} title="Ver detalles" className="text-left">
                          <h3 className="text-base font-semibold leading-tight hover:underline line-clamp-1">
                            {p.titulo}
                          </h3>
                        </button>

                        {/* Bloque título + descripción con altura mínima uniforme */}
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 min-h-[44px]">
                          {p.descripcion}
                        </p>

                        {/* Precio con altura mínima uniforme */}
                        <div className="mt-3 min-h-[70px]">
                          {p.descuento > 0 ? (
                            <>
                              <div className="text-xs text-gray-400 line-through">
                                {formatoPrecio(p.precio, p.moneda)}
                              </div>
                              <div className="text-lg font-extrabold text-gray-900">
                                {formatoPrecio(precioFinal, p.moneda)}
                              </div>
                              <div className="text-[11px] text-rose-600">−{p.descuento}%</div>
                            </>
                          ) : (
                            <div className="text-lg font-bold text-gray-900">
                              {formatoPrecio(p.precio, p.moneda)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                            <Clock size={12} /> {p.tiempoEntrega || "—"}
                          </div>
                        </div>

                        {/* Etiquetas (altura mínima suave para no mover acciones) */}
                        {p.etiquetas?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 min-h-[34px]">
                            {p.etiquetas.map((e) => <Etiqueta key={e}>{e}</Etiqueta>)}
                          </div>
                        )}

                        {/* Acciones siempre al fondo gracias al flex-col de arriba */}
                        <div className="mt-4 flex items-center gap-2">
                          {/* Corazón activado: quita de favoritos */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onRemoveFav(p.id)}
                            className="rounded-full bg-white/90 p-2 shadow hover:shadow-md ring-2 ring-rose-500"
                            title="Quitar de favoritos"
                          >
                            <Heart size={16} className="fill-rose-600 text-rose-600" />
                          </motion.button>

                          {/* Se elimina botón “Añadir al carrito” y “Eliminar del carrito” */}
                          <button
                            onClick={() => addToCart(p, 1, true)}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-50 border-gray-200 inline-flex items-center gap-1.5"
                            title="Comprar ahora"
                          >
                            <BadgeDollarSign size={14} /> Comprar ahora
                          </button>

                          <button
                            onClick={() => openQuick(p)}
                            className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-gray-100"
                            title="Ver detalles"
                          >
                            Ver detalles
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* QuickView */}
      <QuickView
        open={quickOpen}
        onClose={closeQuick}
        producto={quickProducto}
        onAddCart={(p, qty = 1, go = false) => addToCart(p, qty, go)}
      />

      {/* ================= FOOTER ================= */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
