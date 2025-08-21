// src/Tienda.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Heart,
  ChevronRight,
  Sparkles,
  BadgeDollarSign,
  Package,
  Brush,
  Filter,
  X,
  Search,
  Tag,
  Clock,
  ChevronLeft,
} from "lucide-react";

/**
 * Página: Tienda / Productos (v11)
 * - Secciones "Obras destacadas" y "Obras bajo pedido":
 *   • SIN carrusel horizontal.
 *   • Grid fijo de 2 filas x 3 columnas (máx. 6 ítems).
 *   • Botón “Ver más” aplica filtro por tipo.
 * - “Obras en general”:
 *   • Muestra TODOS los productos (o los filtrados) en N filas de 4 columnas en desktop.
 * - QuickView con carrusel de imágenes (se mantiene).
 * - Footer de acciones sticky en el panel derecho del QuickView.
 */

// --- Datos de ejemplo ---
const PRODUCTOS_BASE = [
  {
    id: "p1",
    titulo: "Raíz de vida",
    descripcion: "Acrílico sobre lienzo. 60x80 cm.",
    descripcionDetallada:
      "Obra que explora la relación entre lo orgánico y lo ritual. Capas de acrílico veladas con pinceladas gestuales. Lienzo de algodón 380 g/m², bastidor de pino con acabado mate. Incluye sistema de colgado.",
    imagenes: ["/producto1.jpg", "/producto1b.jpg", "/producto1c.jpg", "/producto1d.jpg", "/producto1e.jpg"],
    precio: 1200,
    moneda: "MXN",
    destacado: true,
    bajoPedido: false,
    etiquetas: ["acrílico", "naturaleza"],
    disponible: true,
    tiempoEntrega: "Listo para envío",
  },
  {
    id: "p2",
    titulo: "Aurora interna",
    descripcion: "Mixta sobre papel reciclado. 50x70 cm.",
    descripcionDetallada:
      "Técnica mixta con pigmentos y tintas sobre papel reciclado libre de ácido (300 g). La pieza combina texturas granulosas y transparencias para sugerir una luz interior.",
    imagenes: ["/producto2.jpg", "/producto2b.jpg", "/producto2c.jpg", "/producto2d.jpg"],
    precio: 900,
    moneda: "MXN",
    destacado: true,
    bajoPedido: false,
    etiquetas: ["mixta", "onírico"],
    disponible: true,
    tiempoEntrega: "Listo para envío",
  },
  {
    id: "p3",
    titulo: "Serie Elementos (3 piezas)",
    descripcion: "Serie de 3 piezas. Técnica mixta.",
    descripcionDetallada:
      "Tríptico que dialoga con los cuatro elementos a través de tres abstracciones. Base acrílica, tinta y grafito sellado con barniz satinado. Se puede instalar en horizontal o vertical.",
    imagenes: ["/producto3.jpg", "/producto3b.jpg", "/producto3c.jpg"],
    precio: 2100,
    moneda: "MXN",
    destacado: true,
    bajoPedido: true,
    etiquetas: ["serie", "mixta"],
    disponible: true,
    tiempoEntrega: "Hecho bajo pedido (2-3 semanas)",
  },
  {
    id: "p4",
    titulo: "Cenit marino",
    descripcion: "Óleo sobre lienzo. 40x60 cm.",
    descripcionDetallada:
      "Pincelada suelta con veladuras de óleo para un efecto de profundidad acuosa. Lienzo tensado en bastidor de pino. Borde pintado para montaje sin marco.",
    imagenes: ["/producto4.jpg", "/producto4b.jpg", "/producto4c.jpg", "/producto4d.jpg", "/producto4e.jpg"],
    precio: 1500,
    moneda: "MXN",
    destacado: false,
    bajoPedido: false,
    etiquetas: ["óleo", "mar"],
    disponible: true,
    tiempoEntrega: "Listo para envío",
  },
  {
    id: "p5",
    titulo: "Bosque de susurros",
    descripcion: "Acuarela. 30x40 cm.",
    descripcionDetallada:
      "Acuarela sobre papel 100% algodón prensado en frío. Paleta fría con detalles húmedo-sobre-húmedo que enfatiza atmósferas y profundidad.",
    imagenes: ["/producto5.jpg", "/producto5b.jpg", "/producto5c.jpg"],
    precio: 600,
    moneda: "MXN",
    destacado: true,
    bajoPedido: false,
    etiquetas: ["acuarela", "paisaje"],
    disponible: true,
    tiempoEntrega: "Listo para envío",
  },
  {
    id: "p6",
    titulo: "Retrato en bruma",
    descripcion: "Mixta sobre madera. 60x60 cm.",
    descripcionDetallada:
      "Soporte de madera sellado y texturizado. Capas de acrílico y carbón para un gesto difuso que insinúa rostro. Barniz protector UV.",
    imagenes: ["/producto6.jpg", "/producto6b.jpg", "/producto6c.jpg", "/producto6d.jpg"],
    precio: 1800,
    moneda: "MXN",
    destacado: true,
    bajoPedido: true,
    etiquetas: ["retrato", "mixta"],
    disponible: true,
    tiempoEntrega: "Hecho bajo pedido (3 semanas)",
  },
  {
    id: "p7",
    titulo: "Geometría íntima",
    descripcion: "Tinta y acrílico. 50x50 cm.",
    descripcionDetallada:
      "Composición abstracta con módulos geométricos y veladuras. Base acrílica con intervenciones en tinta indeleble. Montaje recomendado flotado.",
    imagenes: ["/producto7.jpg", "/producto7b.jpg", "/producto7c.jpg"],
    precio: 1100,
    moneda: "MXN",
    destacado: false,
    bajoPedido: false,
    etiquetas: ["tinta", "abstracto"],
    disponible: true,
    tiempoEntrega: "Listo para envío",
  },
  {
    id: "p8",
    titulo: "Luz de medianoche",
    descripcion: "Acrílico sobre lienzo. 70x90 cm.",
    descripcionDetallada:
      "Gran formato con capas espesas y raspados. Contrastes de azul profundo y toques nacarados. Ideal para muro principal.",
    imagenes: ["/producto8.jpg", "/producto8b.jpg", "/producto8c.jpg", "/producto8d.jpg"],
    precio: 2500,
    moneda: "MXN",
    destacado: false,
    bajoPedido: true,
    etiquetas: ["acrílico", "contemporáneo"],
    disponible: true,
    tiempoEntrega: "Hecho bajo pedido (4 semanas)",
  },
];

const ORDENES = [
  { id: "relevancia", label: "Relevancia" },
  { id: "precio_asc", label: "Precio: bajo a alto" },
  { id: "precio_desc", label: "Precio: alto a bajo" },
  { id: "titulo_asc", label: "Título A-Z" },
];

const categorias = [
  { id: "todas", label: "Todas" },
  { id: "destacadas", label: "Obras destacadas" },
  { id: "bajo_pedido", label: "Obras bajo pedido" },
  { id: "generales", label: "Obras en general" },
];

function formatoPrecio(valor, moneda) {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda || "MXN" }).format(valor);
  } catch {
    return `$${valor} ${moneda || "MXN"}`;
  }
}

function Etiqueta({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur bg-white/60 border-gray-200">
      <Tag size={14} /> {children}
    </span>
  );
}

function CardProducto({ p, onOpen, onAddCart, onFav, favs }) {
  const [hover, setHover] = useState(false);
  const isFav = favs?.includes(p.id);
  const handleOpen = () => onOpen(p);

  return (
    <motion.div
      layout
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleOpen}
      className="group relative cursor-pointer rounded-2xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm hover:shadow-xl transition overflow-hidden"
      initial={{ y: 10, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={(hover && p.imagenes[1]) ? p.imagenes[1] : p.imagenes[0]}
          alt={p.titulo}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.currentTarget.src = p.imagenes?.[0] || "/placeholder.jpg"; }}
        />
        {/* BADGES */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {p.destacado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 text-white text-[11px] px-2.5 py-1 shadow">
              Destacada
            </span>
          )}
          {p.bajoPedido && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/90 text-white text-[11px] px-2.5 py-1 shadow">
              <Brush size={14} /> Bajo pedido
            </span>
          )}
        </div>

        <div
          className="absolute bottom-3 left-3 right-3 flex items-center justify-end opacity-0 group-hover:opacity-100 transition"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2">
            <button
              onClick={() => onFav(p)}
              className={`rounded-full bg-white/90 p-2 shadow hover:shadow-md ${isFav ? "ring-2 ring-rose-500" : ""}`}
              title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart size={18} className={isFav ? "fill-rose-500 text-rose-500" : ""} />
            </button>
            <button
              onClick={() => onAddCart(p)}
              className="rounded-full bg-emerald-600 text-white px-3 py-2 text-xs font-semibold shadow hover:shadow-md flex items-center gap-1"
              title="Añadir al carrito"
            >
              <ShoppingCart size={16} /> Añadir
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-1">{p.titulo}</h3>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{p.descripcion}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-lg font-bold">{formatoPrecio(p.precio, p.moneda)}</div>
          <div className="text-xs text-gray-500 inline-flex items-center gap-1">
            <Clock size={14} /> {p.tiempoEntrega}
          </div>
        </div>
        {p.etiquetas?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.etiquetas.map((e) => (
              <Etiqueta key={e}>{e}</Etiqueta>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Sección con grid limitado (2 filas x 3 cols = 6) y botón Ver más */
function SeccionGridLimitada({ titulo, icon, descripcion, productos, onOpen, onAddCart, onFav, favs, onVerTodo }) {
  const mostrados = productos.slice(0, 6);
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">{icon}{titulo}</h2>
          {descripcion && <p className="text-sm text-gray-600 mt-1">{descripcion}</p>}
        </div>
        <button onClick={onVerTodo} className="text-sm font-semibold inline-flex items-center gap-1 hover:underline">
          Ver más <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mostrados.map((p) => (
            <CardProducto key={p.id} p={p} onOpen={onOpen} onAddCart={onAddCart} onFav={onFav} favs={favs} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Grid general: N filas de 4 columnas en desktop */
function GridGeneral({ productos, onOpen, onAddCart, onFav, favs }) {
  return (
    <section className="mt-5">
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {productos.map((p) => (
            <CardProducto key={p.id} p={p} onOpen={onOpen} onAddCart={onAddCart} onFav={onFav} favs={favs} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---- Carrusel de imágenes (se mantiene para QuickView) ---- */
function ImageCarousel({ images = [], title = "" }) {
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [direction, setDirection] = useState(0);

  const slides = (images || []).slice(0, 5);
  const len = slides.length || 1;

  useEffect(() => {
    if (!autoPlay || len <= 1) return;
    const id = setInterval(() => paginate(1), 10000);
    return () => clearInterval(id);
  }, [autoPlay, len]);

  const paginate = (dir) => { setDirection(dir); setIdx((i) => (i + dir + len) % len); };
  const prev = () => { setAutoPlay(false); paginate(-1); };
  const next = () => { setAutoPlay(false); paginate(1); };
  const goTo = (i) => { setAutoPlay(false); setDirection(i > idx ? 1 : -1); setIdx(i); };

  const swipeConfidenceThreshold = 8000;
  const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const current = slides[idx];

  return (
    <div className="relative w-full select-none">
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={current || idx}
            src={current || "/placeholder.jpg"}
            alt={`${title} ${idx + 1}`}
            className="h-full w-full object-cover"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            dragMomentum={false}
            onDragStart={() => setAutoPlay(false)}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) paginate(1);
              else if (swipe > swipeConfidenceThreshold) paginate(-1);
            }}
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
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="relative w-full sm:max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden m-2">
          <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow">
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-3 md:p-4">
              <ImageCarousel images={producto?.imagenes} title={producto?.titulo} />
            </div>

            <div className="flex flex-col max-h-[80vh] md:max-h-[85vh]">
              <div className="px-5 md:px-6 pt-5 md:pt-6 overflow-y-auto">
                <h3 className="text-xl md:text-2xl font-bold">{producto.titulo}</h3>
                <p className="mt-2 text-gray-600">{producto.descripcion}</p>

                {producto.descripcionDetallada && (
                  <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {producto.descripcionDetallada}
                  </div>
                )}

                <div className="mt-4 text-2xl font-bold">{formatoPrecio(producto.precio, producto.moneda)}</div>
                <div className="mt-3 text-sm text-gray-500 inline-flex items-center gap-2">
                  <Clock size={16} /> {producto.tiempoEntrega}
                </div>

                {producto.etiquetas?.length > 0 && (
                  <div className="mt-4 mb-6 flex flex-wrap gap-2">
                    {producto.etiquetas.map((e) => (
                      <Etiqueta key={e}>{e}</Etiqueta>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 w-full px-5 md:px-6 pb-5 md:pb-6 pt-4 md:pt-4 bg-white/95 backdrop-blur border-t">
                <div className="flex gap-3">
                  <button onClick={() => onAddCart(producto)} className="rounded-xl bg-emerald-600 text-white px-4 py-3 font-semibold inline-flex items-center gap-2 shadow hover:shadow-md">
                    <ShoppingCart size={18} /> Añadir al carrito
                  </button>
                  <button className="rounded-xl border px-4 py-3 font-semibold inline-flex items-center gap-2">
                    <BadgeDollarSign size={18} /> Comprar ahora
                  </button>
                  <button onClick={onClose} className="ml-auto rounded-xl px-4 py-3 font-semibold text-gray-600 hover:text-red-600">
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

export default function Tienda() {
  const navigate = useNavigate();

  const [productos] = useState(PRODUCTOS_BASE);

  // --- ESTADO APLICADO ---
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("relevancia");
  const [categoria, setCategoria] = useState("todas");
  const [precioMax, setPrecioMax] = useState(3000);

  // --- ESTADO DRAFT ---
  const [draftBusqueda, setDraftBusqueda] = useState(busqueda);
  const [draftOrden, setDraftOrden] = useState(orden);
  const [draftCategoria, setDraftCategoria] = useState(categoria);
  const [draftPrecioMax, setDraftPrecioMax] = useState(precioMax);

  // Favoritos / Modal
  const [favoritos, setFavoritos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("favoritos")) || []; } catch { return []; }
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickProducto, setQuickProducto] = useState(null);

  useEffect(() => { localStorage.setItem("favoritos", JSON.stringify(favoritos)); }, [favoritos]);

  useEffect(() => {
    setDraftBusqueda(busqueda);
    setDraftOrden(orden);
    setDraftCategoria(categoria);
    setDraftPrecioMax(precioMax);
  }, [busqueda, orden, categoria, precioMax]);

  // === Aplicar filtro rápido para "Ver más" ===
  const aplicarFiltroTipo = (tipo) => {
    const nuevaCat = tipo; // 'destacadas' | 'bajo_pedido' | 'generales'
    setBusqueda(""); setOrden("relevancia"); setPrecioMax(3000); setCategoria(nuevaCat);
    setDraftBusqueda(""); setDraftOrden("relevancia"); setDraftPrecioMax(3000); setDraftCategoria(nuevaCat);
    const anchor = document.getElementById("lista-general");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const productosFiltrados = useMemo(() => {
    let list = [...productos];

    if (categoria === "destacadas") list = list.filter((p) => p.destacado);
    if (categoria === "bajo_pedido") list = list.filter((p) => p.bajoPedido);
    if (categoria === "generales") list = list.filter((p) => !p.destacado && !p.bajoPedido);

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          p.etiquetas?.some((e) => e.toLowerCase().includes(q))
      );
    }

    list = list.filter((p) => (p.precio || 0) <= (precioMax || 999999));

    switch (orden) {
      case "precio_asc": list.sort((a, b) => a.precio - b.precio); break;
      case "precio_desc": list.sort((a, b) => b.precio - a.precio); break;
      case "titulo_asc": list.sort((a, b) => a.titulo.localeCompare(b.titulo)); break;
      default:
        list.sort((a, b) => Number(b.destacado) - Number(a.destacado) || Number(b.bajoPedido) - Number(a.bajoPedido));
    }
    return list;
  }, [productos, busqueda, orden, categoria, precioMax]);

  const filtrosAplicados = useMemo(() => {
    const base = { busqueda: "", orden: "relevancia", categoria: "todas", precioMax: 3000 };
    return (
      busqueda.trim() !== base.busqueda ||
      orden !== base.orden ||
      categoria !== base.categoria ||
      precioMax !== base.precioMax
    );
  }, [busqueda, orden, categoria, precioMax]);

  const abrirQuick = (p) => { setQuickProducto(p); setQuickOpen(true); };
  const cerrarQuick = () => { setQuickOpen(false); setQuickProducto(null); };
  const addCart = (p) => {
    try {
      const raw = localStorage.getItem("carrito");
      const cart = raw ? JSON.parse(raw) : [];
      const existing = cart.find((i) => i.id === p.id);
      if (existing) existing.cantidad += 1;
      else cart.push({ id: p.id, titulo: p.titulo, precio: p.precio, imagen: p.imagenes?.[0], cantidad: 1 });
      localStorage.setItem("carrito", JSON.stringify(cart));
    } catch {}
    navigate("/carrito");
  };
  const toggleFav = (p) => { setFavoritos(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]); };

  const aplicarFiltros = () => { setBusqueda(draftBusqueda); setOrden(draftOrden); setCategoria(draftCategoria); setPrecioMax(draftPrecioMax); };
  const limpiarFiltros = () => {
    setDraftBusqueda(""); setDraftOrden("relevancia"); setDraftCategoria("todas"); setDraftPrecioMax(3000);
    setBusqueda(""); setOrden("relevancia"); setCategoria("todas"); setPrecioMax(3000);
  };

  // Datos para secciones
  const destacados = productos.filter((p) => p.destacado);
  const bajoPedido = productos.filter((p) => p.bajoPedido);
  const generales = filtrosAplicados ? productosFiltrados : productos.filter((p) => !p.destacado && !p.bajoPedido);

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* INTRO */}
        <section className="pt-6 sm:pt-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="rounded-3xl border bg-white/70 backdrop-blur p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 gap-6 items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                  <Sparkles className="text-amber-600" /> Colección
                </h1>
                <p className="mt-2 text-gray-600">Explora obras originales, piezas bajo pedido y series únicas.</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FILTROS */}
        <section className="mt-4">
          <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Categoría</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categorias.map((c) => (
                    <button key={c.id} onClick={() => setDraftCategoria(c.id)} className={`rounded-full border px-3 py-1.5 text-sm ${draftCategoria === c.id ? "bg-gray-900 text-white border-gray-900" : "bg-white/80"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Búsqueda</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 bg-white/80">
                  <Search size={16} />
                  <input value={draftBusqueda} onChange={(e) => setDraftBusqueda(e.target.value)} placeholder="Título, técnica, etiqueta..." className="w-full bg-transparent outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Precio máximo</label>
                <input type="range" min={200} max={4000} step={50} value={draftPrecioMax} onChange={(e) => setDraftPrecioMax(Number(e.target.value))} className="w-full mt-2" />
                <div className="text-sm font-medium mt-1">Hasta {formatoPrecio(draftPrecioMax, "MXN")}</div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Ordenar por</label>
                <select value={draftOrden} onChange={(e) => setDraftOrden(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white/80 text-sm mt-2">
                  {ORDENES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <button onClick={limpiarFiltros} className="rounded-xl border px-4 py-2 text-sm font-semibold">Limpiar</button>
              <button onClick={aplicarFiltros} className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md inline-flex items-center gap-2">
                <Filter size={16} /> Aplicar filtros
              </button>
            </div>
          </div>
        </section>

        {/* Secciones limitadas (solo sin filtros) */}
        {!filtrosAplicados && (
          <SeccionGridLimitada
            titulo="Obras destacadas"
            icon={<Sparkles className="text-amber-600" />}
            descripcion="Selección curada por la artista."
            productos={destacados}
            onVerTodo={() => aplicarFiltroTipo("destacadas")}
            onOpen={(p) => { setQuickProducto(p); setQuickOpen(true); }}
            onAddCart={(p) => addCart(p)}
            onFav={(p) => toggleFav(p)}
            favs={favoritos}
          />
        )}

        {!filtrosAplicados && (
          <SeccionGridLimitada
            titulo="Obras bajo pedido"
            icon={<Brush className="text-indigo-600" />}
            descripcion="Piezas personalizables hechas especialmente para ti."
            productos={bajoPedido}
            onVerTodo={() => aplicarFiltroTipo("bajo_pedido")}
            onOpen={(p) => { setQuickProducto(p); setQuickOpen(true); }}
            onAddCart={(p) => addCart(p)}
            onFav={(p) => toggleFav(p)}
            favs={favoritos}
          />
        )}

        {/* Resultados / General */}
        <section id="lista-general" className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Package /> {filtrosAplicados ? "Resultados" : "Obras en general"}
            </h2>
            {filtrosAplicados && (
              <div className="text-sm text-gray-500">{generales.length} resultado(s)</div>
            )}
          </div>

          <GridGeneral
            productos={generales}
            onOpen={(p) => { setQuickProducto(p); setQuickOpen(true); }}
            onAddCart={(p) => addCart(p)}
            onFav={(p) => toggleFav(p)}
            favs={favoritos}
          />

          {filtrosAplicados && generales.length === 0 && (
            <div className="mt-6 text-sm text-gray-600">
              No encontramos obras con esos filtros.{" "}
              <button onClick={limpiarFiltros} className="underline font-semibold">Limpiar filtros</button>
            </div>
          )}
        </section>

        {/* Cinta informativa */}
        <section className="mt-14 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
              <div className="font-semibold flex items-center gap-2"><Package className="text-emerald-600" /> Envío seguro</div>
              <p className="text-sm text-gray-600 mt-1">Empaque profesional y número de rastreo.</p>
            </div>
            <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
              <div className="font-semibold flex items-center gap-2"><BadgeDollarSign className="text-emerald-600" /> Pagos protegidos</div>
              <p className="text-sm text-gray-600 mt-1">Transferencia, tarjeta y opciones locales.</p>
            </div>
            <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
              <div className="font-semibold flex items-center gap-2"><Sparkles className="text-emerald-600" /> Certificado de autenticidad</div>
              <p className="text-sm text-gray-600 mt-1">Cada obra incluye firma y certificado.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal QuickView */}
      <QuickView
        open={quickOpen}
        onClose={cerrarQuick}
        producto={quickProducto}
        onAddCart={(p) => addCart(p)}
      />
    </div>
  );
}
