// src/pages/Rastreo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================
   Configuración
   ========================= */

const TRACK_URL =
  import.meta.env.VITE_TRACKING_STATUS_URL ||
  "https://ousgktyljynqzrnafoqd.supabase.co/functions/v1/track-shipment";

const SITE_NAME = import.meta.env.VITE_SITE_NAME || "Arte Restauración Visuales";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/* =========================
   Animaciones (variants)
   ========================= */
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const cardIn = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
};

const staggerCol = {
  hidden: { opacity: 1 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemIn = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

/* =========================
   Utilidades
   ========================= */

const fmt = (d) => {
  try {
    const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return d || "—";
  }
};

function placeToString(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const { city, state, country, postal_code, cp } = v;
    const line1 = [city, state].filter(Boolean).join(", ");
    const line2 = [country, postal_code || cp].filter(Boolean).join(" · ");
    return [line1, line2].filter(Boolean).join(" — ");
  }
  return String(v);
}

const statusLabels = {
  created: "Creado",
  paid: "Pagado",
  packed: "Empacado",
  shipped: "Enviado",
  in_transit: "En tránsito",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  exception: "Incidencia",
  returned: "Devuelto",
};

const statusOrder = [
  "created",
  "paid",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

function clampStatus(s) {
  return statusLabels[s] ? s : "in_transit";
}

function StepDot({ active, done }) {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`h-3 w-3 rounded-full ${
        done ? "bg-emerald-600" : active ? "bg-amber-500" : "bg-gray-300"
      } ${active ? "animate-pulse" : ""}`}
    />
  );
}

/* =====================================
   Componente principal: Rastreo de pedido
   ===================================== */

export default function Rastreo() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState(params.get("order") || "");
  const [trackingCode, setTrackingCode] = useState(params.get("tracking") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState(null);

  const canQuery = useMemo(
    () => !!(orderId || trackingCode),
    [orderId, trackingCode]
  );

  const currentStatus = clampStatus(data?.status || "in_transit");
  const activeIndex = Math.max(0, statusOrder.findIndex((s) => s === currentStatus));
  const progressPct =
    (Math.min(activeIndex + 1, statusOrder.length) / statusOrder.length) * 100;

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      // micro-alertita
      setError(""); // limpiar si había error
    } catch {
      alert("No se pudo copiar");
    }
  };

  // --- Llamada con fallback: POST -> GET ---
  const runQuery = async () => {
    if (!canQuery) {
      setError("Ingresa al menos el código de rastreo o el ID de pedido");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);

    const baseHeaders = {
      "Content-Type": "application/json",
      ...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      "x-client-info": "pb-react-rastreo",
    };

    const parseAndSet = (json) => {
      if (!json) throw new Error("Respuesta vacía del servidor");

      const d = json?.data || json || {};
      const carrier =
        d.carrier || d.paqueteria || d.provider || d?.tracking?.carrier || "";
      const code =
        d.tracking_code || d.code || d.numero || d?.tracking?.code || trackingCode || "";
      const status =
        d.status || d.estado || d.stage || d?.tracking?.status || "in_transit";
      const tracking_url =
        d.tracking_url || d.url || d.link || d?.tracking?.url || "";

      const eta = d.eta || d.estimated_delivery || d.fecha_estimada || "";
      const last_update = d.last_update || d.updated_at || d.fecha || Date.now();

      const origin = placeToString(d.origin || d.origen || d?.route?.origin || "");
      const destination = placeToString(d.destination || d.destino || d?.route?.destination || "");

      const rawCheckpoints =
        d.checkpoints || d.events || d.historial || d?.tracking?.events || [];

      const checkpoints = (rawCheckpoints || []).map((ev) => ({
        time: ev.time || ev.fecha || ev.occurred_at || ev.created_at || "",
        location: ev.location || ev.lugar || ev.city || ev.ciudad || ev.office || "",
        status: ev.status || ev.estado || ev.type || ev.descripcion_corta || "Evento",
        description: ev.description || ev.descripcion || ev.message || ev.detalle || "",
      }));

      setData({
        order_id: d.order_id || d.pedido_id || orderId || "",
        carrier,
        tracking_code: code,
        status,
        tracking_url,
        last_update,
        eta,
        origin,
        destination,
        checkpoints,
      });
    };

    try {
      // 1) Intento POST
      const res = await fetch(TRACK_URL, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({
          order_id: orderId || undefined,
          tracking_code: trackingCode || undefined,
        }),
      });

      let json = null;
      try { json = await res.json(); } catch {}

      if (!res.ok) {
        // 2) Fallback GET
        const url =
          `${TRACK_URL}?` +
          new URLSearchParams({
            ...(orderId ? { order_id: orderId } : {}),
            ...(trackingCode ? { tracking_code: trackingCode } : {}),
          }).toString();

        const resGet = await fetch(url, {
          method: "GET",
          headers: {
            ...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
            "x-client-info": "pb-react-rastreo",
          },
        });

        let jsonGet = null;
        try { jsonGet = await resGet.json(); } catch {}

        if (!resGet.ok) {
          throw new Error(jsonGet?.error || `No se pudo obtener el rastreo (GET ${resGet.status})`);
        }
        parseAndSet(jsonGet);
      } else {
        parseAndSet(json);
      }
    } catch (e) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Consulta automática si venimos con params en URL
  useEffect(() => {
    if (orderId || trackingCode) runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-consulta si los query params cambian
  useEffect(() => {
    const o = params.get("order") || "";
    const t = params.get("tracking") || "";
    setOrderId(o);
    setTrackingCode(t);
    if (o || t) runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerCol}
      className="mx-auto max-w-5xl px-4 py-8"
    >
      {/* Header */}
      <motion.div variants={fadeIn} className="flex items-center gap-2 mb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Volver
        </motion.button>
      </motion.div>

      <motion.div variants={cardIn} className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <motion.div variants={fadeIn} className="flex items-start gap-3">
            <motion.div
              initial={{ rotate: -8, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="h-10 w-10 grid place-items-center rounded-full bg-indigo-100 text-indigo-700"
            >
              <Truck size={20} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">Rastreo de pedido</h1>
              <p className="mt-1 text-sm text-gray-600">
                {SITE_NAME} — consulta el estado y recorrido de tu envío.
              </p>
            </div>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98, rotate: -1 }}
            onClick={runQuery}
            disabled={loading || !canQuery}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualizar
          </motion.button>
        </div>

        {/* Form de consulta */}
        <motion.div variants={staggerCol} className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
          <motion.div variants={itemIn} className="md:col-span-5">
            <label className="text-xs text-gray-600">ID de pedido (opcional)</label>
            <input
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); if (error) setError(""); }}
              placeholder="Ej. AB12C3D4E5"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </motion.div>
          <motion.div variants={itemIn} className="md:col-span-5">
            <label className="text-xs text-gray-600">Código de rastreo</label>
            <input
              value={trackingCode}
              onChange={(e) => { setTrackingCode(e.target.value); if (error) setError(""); }}
              placeholder="Ej. 1Z999AA10123456784"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </motion.div>
          <motion.div variants={itemIn} className="md:col-span-2 flex items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runQuery}
              disabled={loading || !canQuery}
              className="w-full rounded-xl bg-gray-900 text-white px-3 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
            >
              Consultar
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Errores */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2"
            >
              <AlertCircle size={16} className="mt-0.5" />
              <div>{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skeleton de carga */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="h-44 rounded-2xl border overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
                </div>
                <div className="h-64 rounded-2xl border overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-56 rounded-2xl border overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
                </div>
                <div className="h-36 rounded-2xl border overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultado */}
        <AnimatePresence>
          {data && !loading && (
            <motion.div
              variants={staggerCol}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Columna principal */}
              <motion.div variants={itemIn} className="lg:col-span-2 space-y-6">
                {/* Tarjeta de estado */}
                <motion.div variants={cardIn} className="rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {currentStatus === "delivered" ? (
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="h-8 w-8 grid place-items-center rounded-full bg-emerald-100 text-emerald-700"
                        >
                          <CheckCircle2 size={18} />
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ rotate: -8, scale: 0.95 }}
                          animate={{ rotate: 0, scale: 1 }}
                          className="h-8 w-8 grid place-items-center rounded-full bg-indigo-100 text-indigo-700"
                        >
                          <Truck size={18} />
                        </motion.div>
                      )}
                      <div>
                        <div className="text-sm text-gray-500">Estado</div>
                        <div className="text-lg font-semibold">
                          {statusLabels[currentStatus]}
                        </div>
                        {data?.last_update && (
                          <div className="text-xs text-gray-500">
                            Actualizado: {fmt(data.last_update)}
                          </div>
                        )}
                      </div>
                    </div>

                    {data.tracking_url && (
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={data.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                        title="Ver en el sitio del transportista"
                      >
                        Ver en transportista <ExternalLink size={16} />
                      </motion.a>
                    )}
                  </div>

                  {/* Progreso */}
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ type: "tween", duration: 0.6 }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] text-gray-500">
                      {statusOrder.map((s, i) => {
                        const done = i < activeIndex;
                        const active = i === activeIndex;
                        return (
                          <motion.div
                            key={s}
                            variants={itemIn}
                            className="flex flex-col items-center gap-1"
                          >
                            <StepDot done={done} active={active} />
                            <span className="text-center leading-tight">
                              {statusLabels[s]}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>

                {/* Timeline */}
                <motion.div variants={cardIn} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={18} className="text-gray-600" />
                    <h2 className="text-lg font-semibold">Movimientos</h2>
                  </div>

                  {(!data.checkpoints || data.checkpoints.length === 0) ? (
                    <p className="text-sm text-gray-600">
                      Aún no hay eventos para este envío.
                    </p>
                  ) : (
                    <motion.ul
                      variants={staggerCol}
                      initial="hidden"
                      animate="show"
                      className="mt-3 space-y-4"
                    >
                      {data.checkpoints.map((ev, idx) => (
                        <motion.li key={idx} variants={itemIn} className="flex items-start gap-3">
                          <div className="mt-1">
                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {ev.status || "Evento"}
                            </div>
                            {ev.description && (
                              <div className="text-sm text-gray-700">
                                {ev.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              {ev.time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={12} /> {fmt(ev.time)}
                                </span>
                              )}
                              {ev.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} /> {ev.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </motion.div>
              </motion.div>

              {/* Columna lateral */}
              <motion.div variants={itemIn} className="space-y-6">
                <motion.div variants={cardIn} className="rounded-2xl border p-5">
                  <h3 className="text-lg font-semibold">Detalles del envío</h3>

                  <div className="mt-3 text-sm">
                    <InfoRow label="Pedido" value={data.order_id || "—"} />
                    <InfoRow label="Transportista" value={data.carrier || "—"} />
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Código de rastreo</span>
                      <span className="font-medium break-all">
                        {data.tracking_code || "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex gap-2">
                      {data.tracking_code && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onCopy(data.tracking_code)}
                          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                        >
                          <Copy size={14} /> Copiar código
                        </motion.button>
                      )}
                      {data.tracking_url && (
                        <motion.a
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          href={data.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                        >
                          Abrir rastreo <ExternalLink size={14} />
                        </motion.a>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2">
                      <InfoLine icon={<MapPin size={14} />} label="Origen" value={data.origin || "—"} />
                      <InfoLine icon={<MapPin size={14} />} label="Destino" value={data.destination || "—"} />
                      <InfoLine icon={<Clock size={14} />} label="Est. de entrega" value={data.eta ? fmt(data.eta) : "—"} />
                      <InfoLine icon={<Clock size={14} />} label="Última actualización" value={data.last_update ? fmt(data.last_update) : "—"} />
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={cardIn} className="rounded-2xl border p-5">
                  <h3 className="text-lg font-semibold">¿Necesitas ayuda?</h3>
                  <p className="mt-2 text-sm text-gray-700">
                    Si tu envío no avanza en 48–72h, contáctanos con tu número de pedido y código de rastreo.
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* =========================
   Subcomponentes
   ========================= */

function InfoLine({ icon, label, value }) {
  return (
    <motion.div variants={itemIn} className="flex items-start justify-between text-sm">
      <span className="text-gray-600 inline-flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="font-medium text-gray-900 text-right break-all">{value}</span>
    </motion.div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}