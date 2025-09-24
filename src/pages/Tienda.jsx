// src/pages/Tienda.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  // Header / Footer / Menú
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
  // Tienda
  ShoppingCart,
  Heart,
  ChevronRight,
  Sparkles,
  BadgeDollarSign,
  Package,
  Filter,
  X,
  Search,
  Tag,
  Clock,
  ChevronLeft,
  ChevronDown,
  ShieldAlert
} from "lucide-react";

// ===== Supabase =====
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  // Usa las mismas credenciales que ya usaste en Carrito.jsx
  "https://ousgktyljynqzrnafoqd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE"
);

/* ======================= Ordenes / Categorías ======================= */
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

/* ======================= Utiles de precio/etiquetas ======================= */
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
function Etiqueta({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur bg-white/60 border-gray-200">
      <Tag size={14} /> {children}
    </span>
  );
}

/* ======================= Helpers imágenes ======================= */
function buildImgUrl(pathLike) {
  if (!pathLike) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(pathLike)) return pathLike; // absoluta
  if (/^\//.test(pathLike)) return pathLike;           // raíz del sitio
  return `/${String(pathLike).replace(/^public\//, "")}`;
}

// Mapea el row de Supabase al shape del UI
function rowToProductUI(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    descripcionDetallada: r.descripcion_detallada,
    precio: Number(r.precio),
    moneda: r.moneda || "MXN",
    descuento: r.descuento || 0,
    etiquetas: Array.isArray(r.etiquetas) ? r.etiquetas : [],
    imagenes: Array.isArray(r.imagenes) ? r.imagenes.map(buildImgUrl) : [],
    destacado: !!r.destacado,
    bajoPedido: !!r.bajo_pedido,
    disponible: !!r.disponible,
    tiempoEntrega: r.tiempo_entrega || "",
  };
}

/* ======================= (B) Helpers de Carrito & Favoritos ======================= */
function getCartKeyBySession(sesion) {
  return sesion?.id ? `carrito:${sesion.id}` : null;
}
function safeCartCount(cartArray) {
  return (cartArray || []).reduce((sum, it) => {
    const raw = Number(it?.cantidad);
    const qty = Number.isFinite(raw) ? raw : 1;
    return sum + Math.max(0, qty);
  }, 0);
}
function getFavsKeyBySession(sesion) {
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
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
  try { window.dispatchEvent(new CustomEvent("favs:changed", { detail: { key, list } })); } catch {}
  try { const bc = new BroadcastChannel("favs"); bc.postMessage({ key, list }); bc.close(); } catch {}
}

/* ======================= HeartBurst (partículas) ======================= */
function HeartBurst({ fire, onDone }) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const particles = React.useMemo(() => {
    const n = 10 + Math.floor(Math.random() * 6);
    const cols = ["#ef4444","#fb7185","#f59e0b","#10b981","#3b82f6","#a855f7"];
    return Array.from({ length: n }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 40 + Math.random() * 40;
      return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 6 + Math.random() * 6, color: cols[Math.floor(Math.random() * cols.length)], delay: Math.random() * 0.03 };
    });
  }, [fire]);

  if (!fire || prefersReduced) return null;

  return (
    <AnimatePresence onExitComplete={onDone}>
      <motion.div
        key={`burst-${fire}`}
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{ left: "50%", top: "50%", width: p.size, height: p.size, background: p.color, boxShadow: `0 0 0.5px ${p.color}` }}
            initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
            animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: p.delay }}
          />
        ))}
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-400/70"
          style={{ width: 6, height: 6 }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 8, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

/* ======================= CartBurst (partículas) ======================= */
function CartBurst({ fire }) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const particles = React.useMemo(() => {
    const n = 8 + Math.floor(Math.random() * 6);
    const cols = ["#059669","#10b981","#34d399","#a7f3d0","#f59e0b"];
    return Array.from({ length: n }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const dist = 28 + Math.random() * 24;
      return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 4 + Math.random() * 5, color: cols[Math.floor(Math.random() * cols.length)], delay: Math.random() * 0.02 };
    });
  }, [fire]);

  if (!fire || prefersReduced) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`cartburst-${fire}`}
        className="pointer-events-none absolute inset-0 grid place-items-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, background: p.color }}
            initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
            animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: p.delay }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

/* ======================= UI: ComboSelect ======================= */
function ComboSelect({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full rounded-full border border-gray-200 px-4 py-2.5 pr-10 bg-white/80 text-sm
                   focus:outline-none focus:ring-2 focus:ring-[#a16207]/30 focus:border-[#a16207] transition"
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      />
    </div>
  );
}

/* ======================= CARD PRODUCTO ======================= */
function CardProducto({ p, onOpen, onAddCartAnim, onFav, favs }) {
  const [hover, setHover] = useState(false);
  const [burstId, setBurstId] = useState(0);
  const imgRef = useRef(null);
  const isFav = favs?.includes(p.id);
  const handleOpen = () => onOpen(p);

  const tieneDescuento = (p.descuento || 0) > 0;
  const precioFinal = getPrecioFinal(p.precio, p.descuento);

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
          ref={imgRef}
          src={(hover && p.imagenes?.[1]) ? p.imagenes[1] : (p.imagenes?.[0] || "/placeholder.jpg")}
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
          {tieneDescuento && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 text-white text-[11px] px-2.5 py-1 shadow">
              −{p.descuento}% OFF
            </span>
          )}
        </div>

        <div
          className="absolute bottom-3 left-3 right-3 flex items-center justify-end opacity-0 group-hover:opacity-100 transition"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2">
            {/* Favorito */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const eraFav = isFav;
                onFav(p);
                if (!eraFav) setBurstId((x) => x + 1);
              }}
              className={`relative overflow-visible rounded-full bg-white/90 p-2 shadow hover:shadow-md ${isFav ? "ring-2 ring-rose-500" : ""}`}
              title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <motion.span
                initial={false}
                animate={{ scale: isFav ? 1.15 : 1 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="grid place-items-center"
              >
                <Heart size={18} className={isFav ? "fill-rose-500 text-rose-500" : ""} />
              </motion.span>
              <HeartBurst fire={burstId} onDone={() => {}} />
            </button>

            {/* Añadir al carrito */}
            <button
              onClick={() => onAddCartAnim(p, imgRef.current, p.imagenes?.[0])}
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

        {/* Precio */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="flex flex-col">
            {tieneDescuento ? (
              <>
                <span className="text-xs text-gray-400 line-through">
                  {formatoPrecio(p.precio, p.moneda)}
                </span>
                <span className="text-lg font-extrabold text-gray-900 leading-tight">
                  {formatoPrecio(precioFinal, p.moneda)}
                </span>
                <span className="text-xs text-rose-600 font-medium">−{p.descuento}% de descuento</span>
                <span className="text-[11px] text-gray-500 mt-0.5">No incluye impuestos</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-gray-900">
                  {formatoPrecio(p.precio, p.moneda)}
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">No incluye impuestos</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 inline-flex items-center gap-1 shrink-0">
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

/* ======================= SECCIONES ======================= */
function SeccionGridLimitada({ titulo, icon, descripcion, productos, onOpen, onAddCartAnim, onFav, favs, onVerTodo }) {
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
            <CardProducto key={p.id} p={p} onOpen={onOpen} onAddCartAnim={onAddCartAnim} onFav={onFav} favs={favs} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GridGeneral({ productos, onOpen, onAddCartAnim, onFav, favs }) {
  return (
    <section className="mt-5">
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {productos.map((p) => (
            <CardProducto key={p.id} p={p} onOpen={onOpen} onAddCartAnim={onAddCartAnim} onFav={onFav} favs={favs} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ======================= CARRUSEL DE IMAGENES ======================= */
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

/* ======================= QUICK VIEW ======================= */
function QuickView({ open, onClose, producto, onAddCartAnim }) {
  const anchorRef = useRef(null);
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
              <div ref={anchorRef}>
                <ImageCarousel images={producto?.imagenes} title={producto?.titulo} />
              </div>
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

              <div className="sticky bottom-0 w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-4 bg-white/95 backdrop-blur border-t">
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => onAddCartAnim(producto, anchorRef.current, producto.imagenes?.[0])}
                    className="rounded-lg md:rounded-xl bg-emerald-600 text-white px-3 py-2 md:px-4 md:py-3 font-semibold inline-flex items-center gap-2 shadow hover:shadow-md text-sm md:text-base"
                  >
                    <ShoppingCart size={16} className="md:hidden" />
                    <ShoppingCart size={18} className="hidden md:inline" />
                    Añadir al carrito
                  </button>
                  <button className="rounded-lg md:rounded-xl border px-3 py-2 md:px-4 md:py-3 font-semibold inline-flex items-center gap-2 text-sm md:text-base">
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

/* ======================= TOAST ======================= */
function ToastItem({ t, onDone }) {
  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 10, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="pointer-events-auto w-full sm:w-auto"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 backdrop-blur px-3 py-2 shadow-lg">
        <img
          src={t.img || "/placeholder.jpg"}
          alt=""
          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
          onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-emerald-700">¡Añadido al carrito!</div>
          <div className="text-xs text-gray-700 truncate max-w-[60vw] sm:max-w-[320px]">{t.title}</div>
        </div>
      </div>
      <motion.div
        aria-hidden
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: t.ttl / 1000, ease: "linear" }}
        className="h-0.5 bg-emerald-300 rounded mt-1"
        onAnimationComplete={onDone}
      />
    </motion.div>
  );
}

/* ======================= MODAL: Solicitar inicio de sesión ======================= */
function SignInRequiredModal({ open, onClose, onGoLogin }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10001] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.92, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-[92%] sm:w-full sm:max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Necesitas iniciar sesión</h3>
              <p className="text-sm text-gray-600">
                Para guardar artículos en tu carrito, inicia sesión en tu cuenta.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200"
            >
              Más tarde
            </button>
            <button
              onClick={onGoLogin}
              className="rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md inline-flex items-center gap-2"
            >
              <LogIn size={16} /> Iniciar sesión
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ======================= TIENDA ======================= */
export default function Tienda() {
  const navigate = useNavigate();

  // --- Header states ---
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const userMenuTimeout = useRef(null);

  // --- Productos (solo Supabase) ---
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // sesión (solo para carrito/favs)
    try {
      const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
      setUsuarioActivo(sesion?.id ? sesion : null);
    } catch {
      setUsuarioActivo(null);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,titulo,descripcion,descripcion_detallada,precio,moneda,descuento,etiquetas,imagenes,destacado,bajo_pedido,disponible,tiempo_entrega")
          .is("disponible", true)
          .order("destacado", { ascending: false });
        if (error) throw error;
        const mapped = (data || []).map(rowToProductUI);
        setProductos(mapped); // sin fallback local
      } catch (e) {
        console.error("Error cargando productos desde Supabase:", e);
        setProductos([]); // sin fallback local
      } finally {
        setCargando(false);
      }
    };
    load();
  }, []);

  const handleUserMouseEnter = () => {
    clearTimeout(userMenuTimeout.current);
    setShowUserMenu(true);
  };
  const handleUserMouseLeave = () => {
    userMenuTimeout.current = setTimeout(() => setShowUserMenu(false), 300);
  };
  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("carrito"); // legacy
        const prev = JSON.parse(localStorage.getItem("sesionActiva"));
        if (prev?.id) {
          localStorage.removeItem(`carrito:${prev.id}`);
          // localStorage.removeItem(`favoritos:${prev.id}`);
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

  // --- Filtros ---
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("relevancia");
  const [categoria, setCategoria] = useState("todas");
  const [precioMax, setPrecioMax] = useState(3000);

  const [draftBusqueda, setDraftBusqueda] = useState(busqueda);
  const [draftOrden, setDraftOrden] = useState(orden);
  const [draftCategoria, setDraftCategoria] = useState(categoria);
  const [draftPrecioMax, setDraftPrecioMax] = useState(precioMax);

  // --- Favoritos (sincronizados) ---
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    try {
      const current = readFavsBySession(usuarioActivo);
      if ((usuarioActivo?.id) && (!current || current.length === 0)) {
        const legacy = JSON.parse(localStorage.getItem("favoritos") || "[]");
        if (legacy.length > 0) {
          writeFavsBySession(usuarioActivo, legacy);
          localStorage.removeItem("favoritos");
          setFavoritos(legacy);
          return;
        }
      }
      setFavoritos(current || []);
    } catch {
      setFavoritos([]);
    }
  }, [usuarioActivo]);

  useEffect(() => {
    const myKey = getFavsKeyBySession(usuarioActivo);

    const onStorage = (e) => {
      if (e.key === myKey) {
        try { setFavoritos(JSON.parse(e.newValue || "[]") || []); } catch { setFavoritos([]); }
      }
      if (e.key === "sesionActiva") {
        try {
          const ses = JSON.parse(e.newValue);
          setFavoritos(readFavsBySession(ses?.id ? ses : null));
        } catch {}
      }
    };

    const onLocalFavs = (e) => {
      if (e.detail?.key === myKey) {
        setFavoritos(e.detail.list || []);
      }
    };

    let bc;
    try {
      bc = new BroadcastChannel("favs");
      bc.onmessage = (msg) => {
        if (msg?.data?.key === myKey) setFavoritos(msg.data.list || []);
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

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickProducto, setQuickProducto] = useState(null);

  useEffect(() => {
    setDraftBusqueda(busqueda);
    setDraftOrden(orden);
    setDraftCategoria(categoria);
    setDraftPrecioMax(precioMax);
  }, [busqueda, orden, categoria, precioMax]);

  // ---- Carrito: botón, contador, animaciones ----
  const cartBtnRef = useRef(null);
  const [cartBurstId, setCartBurstId] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // Recalcular contador al cambiar sesión
  useEffect(() => {
    try {
      if (!usuarioActivo?.id) { setCartCount(0); return; }
      const key = getCartKeyBySession(usuarioActivo);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      setCartCount(safeCartCount(cart));
    } catch { setCartCount(0); }
  }, [usuarioActivo]);

  // Listeners de storage y focus
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

  useEffect(() => {
    const onFocus = () => {
      try {
        const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
        setUsuarioActivo(sesion?.id ? sesion : null);
        if (sesion?.id) {
          const key = getCartKeyBySession(sesion);
          const cart = JSON.parse(localStorage.getItem(key) || "[]");
          setCartCount(safeCartCount(cart));
        } else {
          setCartCount(0);
        }
      } catch {
        setUsuarioActivo(null);
        setCartCount(0);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ------- Overlay fly-to-cart -------
  const [flying, setFlying] = useState([]); // {id, src, start:{x,y,w,h}, end:{x,y}}
  const flyToCart = (startEl, src) => {
    try {
      if (!startEl || !cartBtnRef.current) return;
      const sr = startEl.getBoundingClientRect();
      const er = cartBtnRef.current.getBoundingClientRect();
      const start = { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2, w: sr.width, h: sr.height };
      const end = { x: er.left + er.width / 2, y: er.top + er.height / 2 };
      const id = Math.random().toString(36).slice(2);
      setFlying((prev) => [...prev, { id, src: src || "/placeholder.jpg", start, end }]);
    } catch {}
  };

  // ------- TOASTS -------
  const [toasts, setToasts] = useState([]); // {id, title, img, ttl}
  const pushToast = (title, img) => {
    const id = Math.random().toString(36).slice(2);
    const ttl = 2400;
    setToasts((prev) => [...prev, { id, title, img, ttl }]);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter(t => t.id !== id));

  // ------- Modal "inicia sesión" -------
  const [needLoginOpen, setNeedLoginOpen] = useState(false);

  const aplicarFiltroTipo = (tipo) => {
    const nuevaCat = tipo;
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

    list = list.filter((p) => (getPrecioFinal(p.precio, p.descuento) || 0) <= (precioMax || 999999));

    switch (orden) {
      case "precio_asc":
        list.sort((a, b) => getPrecioFinal(a.precio, a.descuento) - getPrecioFinal(b.precio, b.descuento));
        break;
      case "precio_desc":
        list.sort((a, b) => getPrecioFinal(b.precio, b.descuento) - getPrecioFinal(a.precio, a.descuento));
        break;
      case "titulo_asc":
        list.sort((a, b) => a.titulo.localeCompare(b.titulo));
        break;
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

  // ---- Persistencia del carrito + bursts (solo si hay sesión) ----
  const persistAddToCart = (p) => {
    if (!usuarioActivo?.id) return;
    const key = getCartKeyBySession(usuarioActivo);
    const raw = localStorage.getItem(key);
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((i) => i.id === p.id);
    if (existing) existing.cantidad += 1;
    else cart.push({ id: p.id, titulo: p.titulo, precio: getPrecioFinal(p.precio, p.descuento), imagen: p.imagenes?.[0], cantidad: 1 });
    localStorage.setItem(key, JSON.stringify(cart));

    const total = safeCartCount(cart);
    setCartCount(total);
    setCartBurstId((x) => x + 1);
  };

  // Añadir con animación o pedir login
  const addCartWithAnim = (p, startEl, imgSrc) => {
    if (!usuarioActivo) {
      setNeedLoginOpen(true);
      return;
    }
    if (startEl) flyToCart(startEl, imgSrc || p.imagenes?.[0]);
    try { persistAddToCart(p); } catch {}
    pushToast(p.titulo, imgSrc || p.imagenes?.[0]);
  };

  // --- Toggle favoritos (persistente + sincronizado) ---
  const toggleFav = (p) => {
    setFavoritos(prev => {
      const next = prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id];
      writeFavsBySession(usuarioActivo, next);
      return next;
    });
  };

  const aplicarFiltros = () => {
    setBusqueda(draftBusqueda);
    setOrden(draftOrden);
    setCategoria(draftCategoria);
    setPrecioMax(draftPrecioMax);
  };
  const limpiarFiltros = () => {
    setDraftBusqueda(""); setDraftOrden("relevancia"); setDraftCategoria("todas"); setDraftPrecioMax(3000);
    setBusqueda(""); setOrden("relevancia"); setCategoria("todas"); setPrecioMax(3000);
  };

  // Datos para secciones
  const destacados = productos.filter((p) => p.destacado);
  const bajoPedido = productos.filter((p) => p.bajoPedido);

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
                          <button onClick={() => navigate("/favoritos")} className="flex items-center w-full px-5 py-2 text-sm hover:bg-gray-100">
                            <HeartIcon size={16} className="mr-2" /> Favoritos
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

      {/* ================= CONTENIDO TIENDA ======================= */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full">
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
          <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Categoría */}
              <div>
                <label className="text-xs text-gray-600">Categoría</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categorias.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setDraftCategoria(c.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition
                        ${draftCategoria === c.id
                          ? "bg-gray-900 text-white border-gray-900 shadow"
                          : "bg-white/80 hover:bg-white border-gray-200"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Búsqueda */}
              <div>
                <label className="text-xs text-gray-600">Búsqueda</label>
                <div className="mt-2 flex items-center gap-2 rounded-full border px-3 py-2 bg-white/80 border-gray-200">
                  <Search size={16} className="text-gray-500" />
                  <input
                    value={draftBusqueda}
                    onChange={(e) => setDraftBusqueda(e.target.value)}
                    placeholder="Título, técnica, etiqueta..."
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>
              </div>

              {/* Precio máximo */}
              <div>
                <label className="text-xs text-gray-600">Precio máximo</label>
                <input
                  type="range"
                  min={200}
                  max={4000}
                  step={50}
                  value={draftPrecioMax}
                  onChange={(e) => setDraftPrecioMax(Number(e.target.value))}
                  className="w-full mt-2 accent-[#a16207]"
                />
                <div className="text-sm font-medium mt-1">
                  Hasta {formatoPrecio(draftPrecioMax, "MXN")}
                </div>
              </div>

              {/* Ordenar por */}
              <div>
                <label className="text-xs text-gray-600">Ordenar por</label>
                <ComboSelect
                  value={draftOrden}
                  onChange={setDraftOrden}
                  className="mt-2 w-full"
                >
                  {ORDENES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </ComboSelect>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <button
                onClick={limpiarFiltros}
                className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-white/90 border-gray-200"
              >
                Limpiar
              </button>
              <button
                onClick={aplicarFiltros}
                className="rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md inline-flex items-center gap-2"
              >
                <Filter size={16} /> Aplicar filtros
              </button>
            </div>
          </div>
        </section>

        {/* Cargando estado */}
        {cargando && (
          <div className="mt-10 text-center text-sm text-gray-600">Cargando obras…</div>
        )}

        {/* Secciones limitadas (solo sin filtros) */}
        {!cargando && !filtrosAplicados && (
          <SeccionGridLimitada
            titulo="Obras destacadas"
            icon={<Sparkles className="text-amber-600" />}
            descripcion="Selección curada por la artista."
            productos={destacados}
            onVerTodo={() => aplicarFiltroTipo("destacadas")}
            onOpen={(p) => { setQuickProducto(p); setQuickOpen(true); }}
            onAddCartAnim={addCartWithAnim}
            onFav={(p) => toggleFav(p)}
            favs={favoritos}
          />
        )}

        {!cargando && !filtrosAplicados && (
          <SeccionGridLimitada
            titulo="Obras bajo pedido"
            icon={<Brush className="text-indigo-600" />}
            descripcion="Piezas personalizables hechas especialmente para ti."
            productos={bajoPedido}
            onVerTodo={() => aplicarFiltroTipo("bajo_pedido")}
            onOpen={(p) => { setQuickProducto(p); setQuickOpen(true); }}
            onAddCartAnim={addCartWithAnim}
            onFav={(p) => toggleFav(p)}
            favs={favoritos}
          />
        )}

        {/* Resultados / General */}
        {!cargando && (
          <section id="lista-general" className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Package /> {filtrosAplicados ? "Resultados" : "Todas las obras"}
              </h2>
              {filtrosAplicados && (
                <div className="text-sm text-gray-500">{productosFiltrados.length} resultado(s)</div>
              )}
            </div>

            <GridGeneral
              productos={filtrosAplicados ? productosFiltrados : productos}
              onOpen={(p) => { setQuickProducto(p); setQuickOpen(true); }}
              onAddCartAnim={addCartWithAnim}
              onFav={(p) => toggleFav(p)}
              favs={favoritos}
            />

            {filtrosAplicados && productosFiltrados.length === 0 && (
              <div className="mt-6 text-sm text-gray-600">
                No encontramos obras con esos filtros.{" "}
                <button onClick={limpiarFiltros} className="underline font-semibold">Limpiar filtros</button>
              </div>
            )}
          </section>
        )}

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
        onAddCartAnim={addCartWithAnim}
      />

      {/* Flying Overlay */}
      <div className="pointer-events-none fixed inset-0 z-[9998]">
        <AnimatePresence>
          {flying.map(item => {
            const size = Math.max(32, Math.min(120, item.start.w || 80));
            return (
              <motion.img
                key={item.id}
                src={item.src || "/placeholder.jpg"}
                alt=""
                initial={{
                  x: item.start.x - size / 2,
                  y: item.start.y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: 12,
                  opacity: 0.95,
                  rotate: 0,
                  scale: 1
                }}
                animate={{
                  x: item.end.x - size / 3,
                  y: item.end.y - size / 3,
                  width: size / 3,
                  height: size / 3,
                  borderRadius: 9999,
                  opacity: 0.3,
                  rotate: 15,
                  scale: 0.9
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ position: "fixed", objectFit: "cover", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}
                onAnimationComplete={() => {
                  setFlying(prev => prev.filter(f => f.id !== item.id));
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal Requiere Login */}
      <SignInRequiredModal
        open={needLoginOpen}
        onClose={() => setNeedLoginOpen(false)}
        onGoLogin={() => {
          setNeedLoginOpen(false);
          navigate("/iniciar-sesion");
        }}
      />
      
      {/* ================= TOAST CONTAINER ================= */}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center w-full px-3 sm:px-0"
        style={{ pointerEvents: "none" }}
      >
        <AnimatePresence initial={false}>
          {toasts.map(t => (
            <ToastItem key={t.id} t={t} onDone={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
