// src/pages/Carrito.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  // Header / Menú
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
  // Carrito
  Trash2,
  Plus,
  Minus,
  Package,
  Ticket,
  Truck,
  Lock,
  ShieldCheck,
  BadgeDollarSign,
  Tag,
  MapPin,
  CheckCircle2,
  X,
  CreditCard,
  Landmark,
  Wallet,
} from "lucide-react";

// === Supabase para productos/direcciones ===
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://ousgktyljynqzrnafoqd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE"
);

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
function Etiqueta({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur bg-white/70 border-gray-200">
      <Tag size={12} /> {children}
    </span>
  );
}

/* ======================= Componentes auxiliares ======================= */
function QtyControl({ value, onChange, min = 1, max = 99 }) {
  return (
    <div className="inline-flex items-center rounded-full border bg-white/90 border-gray-200 overflow-hidden">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="px-2 py-1 hover:bg-gray-50" aria-label="Disminuir">
        <Minus size={16} />
      </button>
      <input
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, "")) || min;
          onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-10 text-center text-sm outline-none"
      />
      <button onClick={() => onChange(Math.min(max, value + 1))} className="px-2 py-1 hover:bg-gray-50" aria-label="Aumentar">
        <Plus size={16} />
      </button>
    </div>
  );
}

function CartRow({ p, qty, onQty, onRemove }) {
  const tieneDescuento = (p.descuento || 0) > 0;
  const precioUnit = getPrecioFinal(p.precio, p.descuento);
  const subtotal = Math.max(1, qty) * precioUnit;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-12 gap-3 sm:gap-4 items-center border-b pb-4"
    >
      <div className="col-span-3 sm:col-span-2">
        <img
          src={p.imagenes?.[0] || "/placeholder.jpg"}
          alt={p.titulo}
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border"
          onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
        />
      </div>

      <div className="col-span-9 sm:col-span-5">
        <div className="font-semibold leading-tight">{p.titulo}</div>
        <div className="text-xs text-gray-600 line-clamp-2">{p.descripcion}</div>
        {p.etiquetas?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {p.etiquetas.slice(0, 3).map((e) => <Etiqueta key={e}>{e}</Etiqueta>)}
          </div>
        )}
        <div className="mt-2">
          <button
            onClick={onRemove}
            className="rounded-full p-1.5 border border-gray-200 bg-white/90 text-gray-700 hover:text-red-600"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="col-span-6 sm:col-span-2">
        {tieneDescuento ? (
          <>
            <div className="text-xs text-gray-400 line-through">{formatoPrecio(p.precio, p.moneda)}</div>
            <div className="font-bold">{formatoPrecio(precioUnit, p.moneda)}</div>
            <div className="text-[11px] text-rose-600">−{p.descuento}%</div>
          </>
        ) : (
          <div className="font-bold">{formatoPrecio(precioUnit, p.moneda)}</div>
        )}
      </div>

      <div className="col-span-6 sm:col-span-1">
        <QtyControl value={qty} onChange={onQty} />
      </div>

      <div className="col-span-12 sm:col-span-2 text-right font-semibold">
        {formatoPrecio(subtotal, p.moneda)}
      </div>
    </motion.div>
  );
}

/* ======== Modal Selección de Dirección ======== */
function DireccionModal({ open, onClose, direcciones = [], onSelect, onAddNew }) {
  if (!open) return null;

  // Nuevo: checkbox para recordar predeterminada
  const [rememberDefault, setRememberDefault] = React.useState(false);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[10010] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-[92%] sm:max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><MapPin /> Selecciona una dirección</h3>
            <button onClick={onClose} className="rounded-full bg-white/90 p-2 border"><X size={18} /></button>
          </div>

          {direcciones.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white/60 p-6 text-center text-gray-600">
              <p className="font-semibold">No tienes direcciones guardadas</p>
              <button onClick={onAddNew} className="mt-3 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md">
                Agregar nueva dirección
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {direcciones.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelect(d, rememberDefault)}
                  className="w-full text-left rounded-xl border bg-white/80 p-4 hover:border-gray-400 transition group"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold">{d.nombre}</div>
                      <div className="text-sm text-gray-700">{d.calle}, {d.ciudad}, {d.estado}</div>
                      <div className="text-xs text-gray-500">{d.pais} · CP {d.cp}</div>
                      {d.referencia && <div className="text-xs text-gray-400 mt-0.5 italic">“{d.referencia}”</div>}
                    </div>
                    <CheckCircle2 className="opacity-0 group-hover:opacity-100 text-emerald-600" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Nuevo: checkbox de recordar como predeterminada */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <input
              id="rememberDefaultDir"
              type="checkbox"
              className="accent-[#a16207]"
              checked={rememberDefault}
              onChange={(e) => setRememberDefault(e.target.checked)}
            />
            <label htmlFor="rememberDefaultDir" className="text-gray-700">
              Recordar como dirección predeterminada
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onAddNew} className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200">
              Agregar/editar direcciones
            </button>
            <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-gray-100">
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ======== Modal Selección de Pago ======== */
function PagoModal({ open, onClose, isMexico, totalMXN, onChoose }) {
  if (!open) return null;

  const feeStripe = Math.round((totalMXN * 0.036 + 3) * 100) / 100;
  const feePayPal = Math.round((totalMXN * 0.0395 + 4) * 100) / 100;
  const ttlStripe = Math.round((totalMXN + feeStripe) * 100) / 100;
  const ttlPayPal = Math.round((totalMXN + feePayPal) * 100) / 100;

  const opciones = [
    ...(isMexico ? [{
      id: "spei",
      title: "SPEI (transferencia)",
      desc: "Sin comisión · Solo México",
      icon: <Landmark className="text-emerald-600" />,
      feeText: "Sin comisión",
      totalText: formatoPrecio(totalMXN, "MXN"),
    }] : []),
    ...(isMexico ? [{
      id: "paypal",
      title: "PayPal",
      desc: "3.95% + $4 MXN",
      icon: <Wallet className="text-sky-700" />,
      feeText: `Comisión aprox: ${formatoPrecio(feePayPal, "MXN")}`,
      totalText: `Total con comisión: ${formatoPrecio(ttlPayPal, "MXN")}`,
    }] : []),
    {
      id: "stripe",
      title: "Tarjeta",
      desc: "3.6% + $3 MXN",
      icon: <CreditCard className="text-indigo-600" />,
      feeText: `Comisión aprox: ${formatoPrecio(feeStripe, "MXN")}`,
      totalText: `Total con comisión: ${formatoPrecio(ttlStripe, "MXN")}`,
    },
  ];

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z=[10020] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-[92%] sm:max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><Lock /> Selecciona método de pago</h3>
            <button onClick={onClose} className="rounded-full bg-white/90 p-2 border"><X size={18} /></button>
          </div>

          <div className="space-y-3">
            {opciones.map(op => (
              <button
                key={op.id}
                onClick={() => onChoose(op.id)}
                className="w-full text-left rounded-xl border bg-white/80 p-4 hover:border-gray-400 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{op.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{op.title}</div>
                    <div className="text-sm text-gray-700">{op.desc}</div>
                    <div className="text-xs text-gray-600 mt-1">{op.feeText}</div>
                    <div className="text-xs font-semibold mt-0.5">{op.totalText}</div>
                  </div>
                  <CheckCircle2 className="opacity-0 group-hover:opacity-100 text-emerald-600" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-gray-100">
              Cancelar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ======================= Página Carrito / Compra ======================= */
export default function Carrito() {
  const navigate = useNavigate();

  // --- Header / sesión ---
  const [hovered, setHovered] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const userMenuTimeout = useRef(null);

  const handleUserMouseEnter = () => { clearTimeout(userMenuTimeout.current); setShowUserMenu(true); };
  const handleUserMouseLeave = () => { userMenuTimeout.current = setTimeout(() => setShowUserMenu(false), 300); };
  const cerrarSesion = () => {
    setCerrandoSesion(true);
    setTimeout(() => {
      try {
        localStorage.removeItem("carrito"); // legacy
        const prev = JSON.parse(localStorage.getItem("sesionActiva"));
        if (prev?.id) localStorage.removeItem(`carrito:${prev.id}`);
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

  // Productos: desde Supabase (como en Tienda)
  const [productos, setProductos] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  useEffect(() => {
    const loadProductos = async () => {
      setProdLoading(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id, titulo, descripcion, precio, descuento, moneda, imagenes, etiquetas");
        if (error) throw error;
        setProductos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error cargando productos:", e);
        setProductos([]);
      } finally {
        setProdLoading(false);
      }
    };
    loadProductos();
  }, []);

  // Datos de contacto (sin favoritos)
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // Direcciones
  const [direcciones, setDirecciones] = useState([]);
  const [direccionSel, setDireccionSel] = useState(null);
  const [dirModalOpen, setDirModalOpen] = useState(false);

  // Pago
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState(null); // 'stripe' | 'paypal' | 'spei'
  const [isMexico, setIsMexico] = useState(true);

  // Cargar sesión + contacto
  useEffect(() => {
    try {
      const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
      setUsuarioActivo(sesion?.id ? sesion : null);
      setEmail(sesion?.email || sesion?.correo || "");
    } catch {
      setUsuarioActivo(null);
    }
    // Heurística para detectar México
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() || "";
      const lang = (navigator.language || "").toLowerCase();
      const isMx = tz.includes("mexico") || lang.includes("es-mx");
      setIsMexico(!!isMx);
    } catch { setIsMexico(true); }
  }, []);

  // Carga teléfono y direcciones desde Supabase cuando haya sesión
  useEffect(() => {
    if (!usuarioActivo?.id) return;
    const load = async () => {
      try {
        const { data: usr } = await supabase
          .from("usuarios")
          .select("telefono")
          .eq("id", usuarioActivo.id)
          .single();
        if (usr?.telefono) setTelefono(usr.telefono);

        const { data: dirs } = await supabase
          .from("direcciones_usuarios")
          .select("*")
          .eq("id_usuario", usuarioActivo.id);
        setDirecciones(dirs || []);

        // Preferir predeterminada; si no, última seleccionada
        try {
          const defId = localStorage.getItem(`direccionPredeterminada:${usuarioActivo.id}`);
          if (defId) {
            const found = (dirs || []).find((d) => String(d.id) === String(defId));
            if (found) {
              setDireccionSel(found);
              return;
            }
          }
          const raw = localStorage.getItem(`direccionSeleccionada:${usuarioActivo.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            const stillThere = (dirs || []).find((d) => d.id === parsed.id);
            setDireccionSel(stillThere || null);
          } else {
            setDireccionSel(null);
          }
        } catch {}
      } catch { /* noop */ }
    };
    load();
  }, [usuarioActivo]);

  // Carrito crudo (solo ids/cantidades) por sesión
  const [rawCart, setRawCart] = useState([]);
  useEffect(() => {
    try {
      if (!usuarioActivo?.id) { setRawCart([]); setCartCount(0); return; }
      const key = getCartKeyBySession(usuarioActivo);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      setRawCart(cart);
      setCartCount(safeCartCount(cart));
    } catch {
      setRawCart([]);
      setCartCount(0);
    }
  }, [usuarioActivo]);

  // Sincronizar por storage / focus
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
            setRawCart(cart);
            setCartCount(safeCartCount(cart));
          } catch { /* noop */ }
        }
      }
    };
    const onFocus = () => {
      try {
        const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
        setUsuarioActivo(sesion?.id ? sesion : null);
        if (sesion?.id) {
          const key = getCartKeyBySession(sesion);
          const cart = JSON.parse(localStorage.getItem(key) || "[]");
          setRawCart(cart);
          setCartCount(safeCartCount(cart));
        } else { setRawCart([]); setCartCount(0); }
      } catch { /* noop */ }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [usuarioActivo]);

  // Derivar ítems (precios e info desde JSON)
  const detailedItems = useMemo(() => {
    if (!Array.isArray(productos) || productos.length === 0) return [];
    return (rawCart || [])
      .map((c) => {
        const prod = productos.find((p) => p.id === c.id);
        if (!prod) return null;
        const precioUnit = getPrecioFinal(prod.precio, prod.descuento);
        const cantidad = Math.max(1, Number(c.cantidad || 1));
        return {
          id: prod.id,
          prod,
          cantidad,
          precioUnit,
          subtotal: precioUnit * cantidad,
        };
      })
      .filter(Boolean);
  }, [rawCart, productos]);

  // Totales
  const [envio, setEnvio] = useState("estandar"); // estandar | retiro | express
  const [cupon, setCupon] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState(null); // {type:'percent'|'flat', value:number, code:string}

  const subtotal = useMemo(() => detailedItems.reduce((s, it) => s + it.subtotal, 0), [detailedItems]);

  const costoEnvio = useMemo(() => {
    if (envio === "retiro") return 0;
    if (envio === "express") return detailedItems.length ? 350 : 0;
    return detailedItems.length ? 200 : 0; // estándar
  }, [envio, detailedItems.length]);

  const descuento = useMemo(() => {
    if (!cuponAplicado) return 0;
    if (cuponAplicado.type === "percent") return Math.round(subtotal * (cuponAplicado.value / 100) * 100) / 100;
    if (cuponAplicado.type === "flat") return Math.min(subtotal, cuponAplicado.value);
    return 0;
  }, [cuponAplicado, subtotal]);

  const total = Math.max(0, subtotal - descuento + costoEnvio);

  // Acciones carrito (localStorage por sesión — se mantiene)
  const writeCart = (next) => {
    if (!usuarioActivo?.id) return;
    const key = getCartKeyBySession(usuarioActivo);
    localStorage.setItem(key, JSON.stringify(next));
    setRawCart(next);
    setCartCount(safeCartCount(next));
  };
  const updateQty = (id, qty) => {
    writeCart((rawCart || []).map((i) => (i.id === id ? { ...i, cantidad: qty } : i)));
  };
  const removeItem = (id) => {
    writeCart((rawCart || []).filter((i) => i.id !== id));
  };
  const clearCart = () => writeCart([]);

  // Manejo selección de dirección
  const openSelectDireccion = async () => {
    if (!usuarioActivo?.id) return;
    if (!direcciones || direcciones.length === 0) {
      navigate("/direccion");
      return;
    }
    setDirModalOpen(true);
  };
  const selectDireccion = (d, remember) => {
    setDireccionSel(d);
    try {
      localStorage.setItem(`direccionSeleccionada:${usuarioActivo.id}`, JSON.stringify(d));
      if (remember) {
        localStorage.setItem(`direccionPredeterminada:${usuarioActivo.id}`, String(d.id));
      }
    } catch {}
    setDirModalOpen(false);
  };

  // Cupón (placeholder)
  const applyCoupon = () => {
    const code = cupon.trim().toUpperCase();
    if (!code) { setCuponAplicado(null); return; }
    else setCuponAplicado({ type: "none", value: 0, code });
  };

  // Guardar envío
  const setEnvioAndPersist = (value) => {
    setEnvio(value);
    try { if (usuarioActivo?.id) localStorage.setItem(`envio:${usuarioActivo.id}`, value); } catch {}
  };

  // Continuar (abrir modal de pago)
  const continuarPago = () => {
    if (detailedItems.length === 0) return;
    if (!direccionSel) {
      if (direcciones.length === 0) {
        navigate("/direccion");
      } else {
        setDirModalOpen(true);
      }
      return;
    }
    try { if (usuarioActivo?.id) localStorage.setItem(`envio:${usuarioActivo.id}`, envio); } catch {}
    setPagoModalOpen(true);
  };

  // Si no hay sesión: bloquear acceso
  if (!usuarioActivo) {
    return (
      <div className="min-h-screen bg-[#f9f4ef] text-[#333] grid place-items-center px-6">
        <div className="max-w-md w-full rounded-2xl border bg-white/80 backdrop-blur p-6 shadow-sm text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
            <Lock size={20} />
          </div>
          <h1 className="text-xl font-semibold mt-3">Debes iniciar sesión</h1>
          <p className="text-sm text-gray-600 mt-1">para revisar tu carrito, datos de contacto y dirección de envío.</p>
          <div className="mt-4 flex gap-2 justify-center">
            <button onClick={() => navigate("/iniciar-sesion")} className="rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md">
              Iniciar sesión
            </button>
            <button onClick={() => navigate("/registro")} className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200">
              Crear cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                          {/* Eliminado botón Favoritos */}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de ítems */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border bg-white/70 backdrop-blur p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <Package className="text-emerald-600" /> Tu carrito
                </h1>
                {detailedItems.length > 0 && (
                  <button onClick={clearCart} className="text-sm text-rose-700 hover:underline inline-flex items-center gap-1">
                    <Trash2 size={14} /> Vaciar carrito
                  </button>
                )}
              </div>

              {detailedItems.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed bg-white/60 p-8 text-center text-gray-600">
                  <p className="text-lg font-semibold">No hay artículos en tu carrito</p>
                  <p className="text-sm mt-1">Explora la colección y agrega tus piezas favoritas.</p>
                  <button
                    onClick={() => navigate("/tienda")}
                    className="mt-4 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
                  >
                    Ir a la tienda
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <AnimatePresence initial={false}>
                    {detailedItems.map(({ id, prod, cantidad }) => (
                      <CartRow
                        key={id}
                        p={prod}
                        qty={cantidad}
                        onQty={(q) => updateQty(id, q)}
                        onRemove={() => removeItem(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
                <div className="font-semibold flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> Pagos seguros</div>
                <p className="text-sm text-gray-600 mt-1">Tus datos están protegidos con cifrado.</p>
              </div>
              <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
                <div className="font-semibold flex items-center gap-2"><Truck className="text-emerald-600" /> Envío asegurado</div>
                <p className="text-sm text-gray-600 mt-1">Empaque profesional y número de rastreo.</p>
              </div>
              <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
                <div className="font-semibold flex items-center gap-2"><BadgeDollarSign className="text-emerald-600" /> Garantía</div>
                <p className="text-sm text-gray-600 mt-1">Autenticidad certificada en cada obra.</p>
              </div>
            </div>
          </div>

          {/* Sidebar resumen + Contacto + Dirección */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6 rounded-3xl border bg-white/80 backdrop-blur p-5 sm:p-6 shadow-sm space-y-5">
              {/* Datos de contacto */}
              <section>
                <h2 className="text-xl font-bold">Datos de contacto</h2>
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-600" />
                    <span className="font-medium">{email || "—"}</span>
                  </div>
                  {telefono && (
                    <div className="mt-1 text-gray-600">Tel: {telefono}</div>
                  )}
                </div>
              </section>

              {/* Dirección de envío */}
              <section className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Dirección de envío</h3>
                  <button
                    onClick={openSelectDireccion}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-50 border-gray-200 inline-flex items-center gap-1.5"
                  >
                    <MapPin size={14} /> Seleccionar
                  </button>
                </div>

                {direccionSel ? (
                  <div className="mt-2 rounded-xl border bg-white/70 p-3 text-sm">
                    <div className="font-semibold">{direccionSel.nombre}</div>
                    <div>{direccionSel.calle}</div>
                    <div>{direccionSel.ciudad}, {direccionSel.estado}</div>
                    <div className="text-gray-600">{direccionSel.pais} · CP {direccionSel.cp}</div>
                    {direccionSel.referencia && <div className="text-gray-500 text-xs mt-0.5 italic">“{direccionSel.referencia}”</div>}
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed bg-white/60 p-3 text-sm text-gray-600">
                    Aún no has seleccionado una dirección.
                  </div>
                )}
              </section>

              {/* Cupón */}
              <section className="border-t pt-4">
                <label className="text-xs text-gray-600">Cupón</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={cupon}
                    onChange={(e) => setCupon(e.target.value)}
                    placeholder="ARTE10, BIENVENIDA100…"
                    className="flex-1 rounded-full border px-3 py-2 bg-white/90 border-gray-200 text-sm outline-none"
                  />
                  <button
                    onClick={applyCoupon}
                    className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200 inline-flex items-center gap-1.5"
                  >
                    <Ticket size={16} /> Aplicar
                  </button>
                </div>
                {cuponAplicado && cuponAplicado.type !== "none" && (
                  <div className="mt-1 text-xs text-emerald-700">Cupón <strong>{cuponAplicado.code}</strong> aplicado.</div>
                )}
                {cuponAplicado && cuponAplicado.type === "none" && (
                  <div className="mt-1 text-xs text-rose-700">Cupón no válido.</div>
                )}
              </section>

              {/* Envío */}
              <section className="border-t pt-4">
                <div className="text-sm font-semibold mb-1">Método de envío</div>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="envio"
                      className="accent-[#a16207]"
                      checked={envio==="estandar"}
                      onChange={() => setEnvioAndPersist("estandar")}
                    />
                    Envío estándar (3–6 días) — {formatoPrecio(detailedItems.length ? 200 : 0, "MXN")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="envio"
                      className="accent-[#a16207]"
                      checked={envio==="express"}
                      onChange={() => setEnvioAndPersist("express")}
                    />
                    Envío express (1–2 días) — {formatoPrecio(detailedItems.length ? 350 : 0, "MXN")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="envio"
                      className="accent-[#a16207]"
                      checked={envio==="retiro"}
                      onChange={() => setEnvioAndPersist("retiro")}
                    />
                    Retiro en taller — {formatoPrecio(0, "MXN")}
                  </label>
                </div>
              </section>

              {/* Totales */}
              <section className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatoPrecio(subtotal, "MXN")}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Descuento</span>
                    <span className="font-semibold">−{formatoPrecio(descuento, "MXN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="font-semibold">{formatoPrecio(costoEnvio, "MXN")}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatoPrecio(total, "MXN")}</span>
                </div>
                <div className="text-[11px] text-gray-500">Impuestos y costos finales se calculan en el último paso.</div>
              </section>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  disabled={detailedItems.length === 0}
                  onClick={continuarPago}
                  className={`rounded-full text-white px-4 py-3 text-sm font-semibold shadow hover:shadow-md inline-flex items-center justify-center gap-2 ${detailedItems.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900"}`}
                >
                  <Lock size={16} /> Continuar con el pago
                </button>

                {/* Nota de comisiones justo debajo del botón */}
                <div className="text-[11px] text-gray-600 -mt-1">
                  {isMexico ? (
                    <div>Stripe: 3.6% + $3 MXN · PayPal: 3.95% + $4 MXN · SPEI: sin comisión (solo México)</div>
                  ) : (
                    <div>Stripe: 3.6% + $3 (tu ubicación no es México, disponible solo Stripe)</div>
                  )}
                </div>

                <button
                  onClick={() => navigate("/tienda")}
                  className="rounded-full border px-4 py-3 text-sm font-semibold bg-white hover:bg-gray-50 border-gray-200"
                >
                  Seguir comprando
                </button>
              </div>

              {/* Sellos */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600">
                <div className="rounded-xl border bg-white/70 p-2">
                  <ShieldCheck className="mx-auto" size={16} />
                  Seguro
                </div>
                <div className="rounded-xl border bg-white/70 p-2">
                  <Truck className="mx-auto" size={16} />
                  Envío protegido
                </div>
                <div className="rounded-xl border bg-white/70 p-2">
                  <BadgeDollarSign className="mx-auto" size={16} />
                  Garantía
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="w-full py-6 border-t border-gray-300 text-center mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm">&copy; 2025 Arte - Restauración - Visuales. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Modal de selección de dirección */}
      <DireccionModal
        open={dirModalOpen}
        onClose={() => setDirModalOpen(false)}
        direcciones={direcciones}
        onSelect={selectDireccion}
        onAddNew={() => navigate("/direccion")}
      />

      {/* Modal de selección de pago */}
      <PagoModal
        open={pagoModalOpen}
        onClose={() => setPagoModalOpen(false)}
        isMexico={isMexico}
        totalMXN={total}
        onChoose={(metodo) => {
          setMetodoPago(metodo);
          setPagoModalOpen(false);
          try { localStorage.setItem(`metodoPago:${usuarioActivo.id}`, metodo); } catch {}
          if (metodo === "spei") {
            navigate("/pago/spei");
          } else if (metodo === "paypal") {
            navigate("/pago/paypal");
          } else {
            navigate("/pago/stripe");
          }
        }}
      />
    </div>
  );
}
