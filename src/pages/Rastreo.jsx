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

/* =========================
   Configuración
   ========================= */

const TRACK_URL =
  import.meta.env.VITE_TRACKING_STATUS_URL ||
  // Cambia este fallback por tu Edge Function real:
  "https://ousgktyljynqzrnafoqd.supabase.co/functions/v1/track-shipment";

const SITE_NAME = import.meta.env.VITE_SITE_NAME || "Arte Restauración Visuales";

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
  if (done) return <div className="h-3 w-3 rounded-full bg-emerald-600" />;
  if (active) return (
    <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
  );
  return <div className="h-3 w-3 rounded-full bg-gray-300" />;
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
  // Estructura esperada tras normalizar:
  // {
  //   order_id, carrier, tracking_code, status, tracking_url,
  //   last_update, eta, origin, destination,
  //   checkpoints: [{ time, location, status, description }]
  // }

  const canQuery = useMemo(
    () => !!(orderId || trackingCode),
    [orderId, trackingCode]
  );

  const currentStatus = clampStatus(data?.status || "in_transit");

  const activeIndex = Math.max(
    0,
    statusOrder.findIndex((s) => s === currentStatus)
  );
  const progressPct =
    (Math.min(activeIndex + 1, statusOrder.length) / statusOrder.length) * 100;

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      alert("Copiado ✅");
    } catch {
      alert("No se pudo copiar");
    }
  };

  const runQuery = async () => {
    if (!canQuery) {
      setError("Ingresa al menos el código de rastreo o el ID de pedido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(TRACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // === Payload flexible: ajusta según tu función ===
        body: JSON.stringify({
          order_id: orderId || undefined,
          tracking_code: trackingCode || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo obtener el rastreo");
      }

      // ========== MAPEOS ==========
      // Normaliza la respuesta a una forma consistente con la UI.
      const d = json?.data || json || {};
      const carrier =
        d.carrier ||
        d.paqueteria ||
        d.provider ||
        d?.tracking?.carrier ||
        "";
      const code =
        d.tracking_code ||
        d.code ||
        d.numero ||
        d?.tracking?.code ||
        trackingCode ||
        "";
      const status =
        d.status ||
        d.estado ||
        d.stage ||
        d?.tracking?.status ||
        "in_transit";
      const tracking_url =
        d.tracking_url || d.url || d.link || d?.tracking?.url || "";

      const eta = d.eta || d.estimated_delivery || d.fecha_estimada || "";
      const last_update = d.last_update || d.updated_at || d.fecha || Date.now();

      const origin =
        placeToString(d.origin || d.origen || d?.route?.origin || "");
      const destination =
        placeToString(d.destination || d.destino || d?.route?.destination || "");

      const rawCheckpoints =
        d.checkpoints || d.events || d.historial || d?.tracking?.events || [];

      const checkpoints = (rawCheckpoints || []).map((ev) => ({
        time: ev.time || ev.fecha || ev.occurred_at || ev.created_at || "",
        location:
          ev.location || ev.lugar || ev.city || ev.ciudad || ev.office || "",
        status:
          ev.status ||
          ev.estado ||
          ev.type ||
          ev.descripcion_corta ||
          "Evento",
        description:
          ev.description || ev.descripcion || ev.message || ev.detalle || "",
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
    } catch (e) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Consulta automática si venimos con params en URL (montaje)
  useEffect(() => {
    if (orderId || trackingCode) runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-consulta si los query params cambian después
  useEffect(() => {
    const o = params.get("order") || "";
    const t = params.get("tracking") || "";
    setOrderId(o);
    setTrackingCode(t);
    if (o || t) runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-indigo-100 text-indigo-700">
              <Truck size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Rastreo de pedido</h1>
              <p className="mt-1 text-sm text-gray-600">
                {SITE_NAME} — consulta el estado y recorrido de tu envío.
              </p>
            </div>
          </div>

          <button
            onClick={runQuery}
            disabled={loading || !canQuery}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {/* Form de consulta */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="text-xs text-gray-600">ID de pedido (opcional)</label>
            <input
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); if (error) setError(""); }}
              placeholder="Ej. AB12C3D4E5"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="md:col-span-5">
            <label className="text-xs text-gray-600">Código de rastreo</label>
            <input
              value={trackingCode}
              onChange={(e) => { setTrackingCode(e.target.value); if (error) setError(""); }}
              placeholder="Ej. 1Z999AA10123456784"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={runQuery}
              disabled={loading || !canQuery}
              className="w-full rounded-xl bg-gray-900 text-white px-3 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
            >
              Consultar
            </button>
          </div>
        </div>

        {/* Errores */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Resultado */}
        {data && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tarjeta de estado */}
              <div className="rounded-2xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {currentStatus === "delivered" ? (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={18} />
                      </div>
                    ) : (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-indigo-100 text-indigo-700">
                        <Truck size={18} />
                      </div>
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
                    <a
                      href={data.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                      title="Ver en el sitio del transportista"
                    >
                      Ver en transportista <ExternalLink size={16} />
                    </a>
                  )}
                </div>

                {/* Progreso */}
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] text-gray-500">
                    {statusOrder.map((s, i) => {
                      const done = i < activeIndex;
                      const active = i === activeIndex;
                      return (
                        <div key={s} className="flex flex-col items-center gap-1">
                          <StepDot done={done} active={active} />
                          <span className="text-center leading-tight">
                            {statusLabels[s]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-2xl border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={18} className="text-gray-600" />
                  <h2 className="text-lg font-semibold">Movimientos</h2>
                </div>

                {(!data.checkpoints || data.checkpoints.length === 0) ? (
                  <p className="text-sm text-gray-600">
                    Aún no hay eventos para este envío.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {data.checkpoints.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-3">
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              <div className="rounded-2xl border p-5">
                <h3 className="text-lg font-semibold">Detalles del envío</h3>

                <div className="mt-3 text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-600">Pedido</span>
                    <span className="font-medium">{data.order_id || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-600">Transportista</span>
                    <span className="font-medium">{data.carrier || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-600">Código de rastreo</span>
                    <span className="font-medium break-all">
                      {data.tracking_code || "—"}
                    </span>
                  </div>

                  <div className="mt-2 flex gap-2">
                    {data.tracking_code && (
                      <button
                        onClick={() => onCopy(data.tracking_code)}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      >
                        <Copy size={14} /> Copiar código
                      </button>
                    )}
                    {data.tracking_url && (
                      <a
                        href={data.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      >
                        Abrir rastreo <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <InfoLine icon={<MapPin size={14} />} label="Origen" value={data.origin || "—"} />
                    <InfoLine icon={<MapPin size={14} />} label="Destino" value={data.destination || "—"} />
                    <InfoLine icon={<Clock size={14} />} label="Est. de entrega" value={data.eta ? fmt(data.eta) : "—"} />
                    <InfoLine icon={<Clock size={14} />} label="Última actualización" value={data.last_update ? fmt(data.last_update) : "—"} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-5">
                <h3 className="text-lg font-semibold">¿Necesitas ayuda?</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Si tu envío no avanza en 48–72h, contáctanos con tu número de pedido y código de rastreo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Subcomponentes
   ========================= */

function InfoLine({ icon, label, value }) {
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-gray-600 inline-flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="font-medium text-gray-900 text-right break-all">{value}</span>
    </div>
  );
}