// src/pages/AdminRastreo.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Search, CornerUpLeft, LogOut, Save, Loader2, ArrowLeftRight,
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Undo2, ExternalLink, Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

/* =========================
   Config / Supabase
   ========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PASS   = import.meta.env.VITE_ADMIN_PASSWORD || import.meta.env.VITE_ADMIN_PASS || "";
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   Estados y helpers
   ========================= */
const STATUS = [
  "created",
  "paid",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];
const STATUS_LABEL = {
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
const ALL_STATUSES = [...STATUS, "exception", "returned"];

const fmtDateTime = (d) => {
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" })
      .format(new Date(d));
  } catch { return "—"; }
};

/* =========================
   Página
   ========================= */
export default function AdminRastreo() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");

  // búsqueda
  const [qOrder, setQOrder] = useState("");
  const [qTracking, setQTracking] = useState("");

  // envío cargado
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // formulario editable
  const [form, setForm] = useState({
    order_id: "",
    carrier: "",
    tracking_code: "",
    tracking_url: "",
    status: "in_transit",
    destination: null, // opcional
    updated_at: null,
  });

  const progressPct = useMemo(() => {
    const i = Math.max(0, STATUS.findIndex((s) => s === form.status));
    return Math.min(((i + 1) / STATUS.length) * 100, 100);
  }, [form.status]);

  const loadByOrderOrTracking = async () => {
    if (!qOrder && !qTracking) {
      setError("Ingresa un ID de pedido o un código de rastreo.");
      return;
    }
    setError("");
    setLoading(true);
    setRow(null);
    try {
      let data = null;
      if (qOrder) {
        const { data: r, error: e } = await supabase
          .from("shipments")
          .select("*")
          .eq("order_id", qOrder)
          .maybeSingle();
        if (e) throw e;
        data = r || null;
      }
      if (!data && qTracking) {
        const { data: r2, error: e2 } = await supabase
          .from("shipments")
          .select("*")
          .eq("tracking_code", qTracking)
          .maybeSingle();
        if (e2) throw e2;
        data = r2 || null;
      }

      // si no existe, pre llenar para crear
      if (!data) {
        const initial = {
          order_id: qOrder || "",
          carrier: "",
          tracking_code: qTracking || "",
          tracking_url: "",
          status: "in_transit",
          destination: null,
          updated_at: null,
        };
        setRow(null);
        setForm(initial);
      } else {
        setRow(data);
        setForm({
          order_id: data.order_id || "",
          carrier: data.carrier || "",
          tracking_code: data.tracking_code || "",
          tracking_url: data.tracking_url || "",
          status: data.status || "in_transit",
          destination: data.destination ?? null,
          updated_at: data.updated_at || null,
        });
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const moveStep = (delta) => {
    const i = STATUS.findIndex((s) => s === form.status);
    if (i < 0) return;
    const next = STATUS[Math.min(Math.max(i + delta, 0), STATUS.length - 1)];
    setForm((f) => ({ ...f, status: next }));
  };

  const setHardStatus = (s) => setForm((f) => ({ ...f, status: s }));

  const onSave = async () => {
    if (!form.order_id) {
      setError("Falta order_id para guardar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        order_id: form.order_id,
        carrier: form.carrier || null,
        tracking_code: form.tracking_code || null,
        tracking_url: form.tracking_url || null,
        status: form.status || "in_transit",
        destination: form.destination ?? null,
        updated_at: new Date().toISOString(),
      };

      // upsert por order_id
      const { data, error } = await supabase
        .from("shipments")
        .upsert(payload, { onConflict: "order_id" })
        .select()
        .single();

      if (error) throw error;
      setRow(data);
      setForm((f) => ({ ...f, updated_at: data.updated_at || payload.updated_at }));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     UI
     ========================= */

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f9f4ef]">
        <div className="w-full max-w-sm bg-white rounded-2xl border shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="text-[#a16207]" />
            <h1 className="text-lg font-semibold">Admin · Rastreos</h1>
          </div>
          <label className="text-sm text-gray-600">Contraseña de admin</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!ADMIN_PASS || passInput === ADMIN_PASS) setAuthed(true);
                else alert("Contraseña incorrecta.");
              }
            }}
          />
          <button
            onClick={() => {
              if (!ADMIN_PASS || passInput === ADMIN_PASS) setAuthed(true);
              else alert("Contraseña incorrecta.");
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold hover:bg-[#854d06]"
          >
            Entrar
          </button>

          <button
            onClick={() => navigate("/admin")}
            className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <CornerUpLeft size={16} /> Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0eae2]/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-white border">
              <Truck className="text-[#a16207]" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Administración</div>
              <div className="font-semibold">Rastreos de envíos</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
              title="Volver"
            >
              <CornerUpLeft size={16} /> Panel
            </button>
            <button
              onClick={() => setAuthed(false)}
              className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1px_1fr] gap-6">
        {/* Buscador + Editor */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-white shadow-sm p-5"
          >
            <div className="flex items-center gap-2">
              <Search className="text-[#a16207]" />
              <h2 className="text-lg font-semibold">Buscar envío</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600">ID de pedido</label>
                <input
                  value={qOrder}
                  onChange={(e) => setQOrder(e.target.value)}
                  placeholder="Ej. 8242f430-..."
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Código de rastreo</label>
                <input
                  value={qTracking}
                  onChange={(e) => setQTracking(e.target.value)}
                  placeholder="Ej. 1Z999AA10123456784"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadByOrderOrTracking}
                  disabled={loading}
                  className="w-full rounded-xl bg-gray-900 text-white px-3 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin inline mr-2" /> : null}
                  Buscar / Cargar
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editor */}
            <div className="mt-6 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Pedido (order_id)</label>
                  <input
                    value={form.order_id}
                    onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
                    placeholder="Obligatorio para guardar"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Transportista (carrier)</label>
                  <input
                    value={form.carrier}
                    onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                    placeholder="Ej. DHL, FedEx, Estafeta…"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Código de rastreo</label>
                  <input
                    value={form.tracking_code}
                    onChange={(e) => setForm((f) => ({ ...f, tracking_code: e.target.value }))}
                    placeholder="Número proporcionado por la paquetería"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 break-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">URL del rastreo (opcional)</label>
                  <input
                    value={form.tracking_url}
                    onChange={(e) => setForm((f) => ({ ...f, tracking_url: e.target.value }))}
                    placeholder="Enlace directo del carrier"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* Estado & Progreso */}
              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="text-gray-600" size={18} />
                    <div>
                      <div className="text-xs text-gray-500">Estado</div>
                      <div className="font-semibold">
                        {STATUS_LABEL[form.status] || form.status}
                      </div>
                      {form.updated_at && (
                        <div className="text-xs text-gray-500">
                          Actualizado: {fmtDateTime(form.updated_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => moveStep(-1)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                      title="Retroceder estado"
                    >
                      <ChevronLeft size={16} /> Retroceder
                    </button>
                    <button
                      onClick={() => moveStep(1)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                      title="Avanzar estado"
                    >
                      Avanzar <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => setHardStatus("delivered")}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 text-emerald-700"
                      title="Marcar como entregado"
                    >
                      <CheckCircle2 size={16} /> Entregado
                    </button>
                    <button
                      onClick={() => setHardStatus("exception")}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 text-amber-700"
                      title="Marcar incidencia"
                    >
                      <AlertTriangle size={16} /> Incidencia
                    </button>
                    <button
                      onClick={() => setHardStatus("returned")}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                      title="Marcar como devuelto"
                    >
                      <Undo2 size={16} /> Devuelto
                    </button>
                  </div>
                </div>

                {/* barra de progreso */}
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ type: "tween", duration: 0.5 }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-2 text-[11px] text-gray-500">
                    {STATUS.map((s) => (
                      <div key={s} className="text-center">
                        {STATUS_LABEL[s]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* selector directo */}
                <div className="mt-4">
                  <label className="text-xs text-gray-600">Cambiar estado directamente</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full md:w-64 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s] || s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guardar */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onSave}
                  disabled={saving || !form.order_id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold hover:bg-[#854d06] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Guardar cambios
                </button>

                {form.tracking_url && (
                  <a
                    href={form.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    title="Abrir rastreo"
                  >
                    Abrir rastreo <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-gray-200 rounded-full" />

        {/* Resumen actual */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-white shadow-sm p-5"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="text-[#a16207]" />
              <h2 className="text-lg font-semibold">Resumen del envío</h2>
            </div>

            {!form.order_id && !row ? (
              <div className="mt-4 text-sm text-gray-600">
                Busca un pedido para ver detalles o crea el envío con los datos de la izquierda.
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <Info label="Pedido" value={form.order_id || "—"} />
                <Info label="Transportista" value={form.carrier || "—"} />
                <Info label="Código de rastreo" value={form.tracking_code || "—"} mono />
                <Info label="URL de rastreo" value={form.tracking_url || "—"} />
                <Info label="Estado" value={STATUS_LABEL[form.status] || form.status} />
                <Info label="Última actualización" value={fmtDateTime(form.updated_at) || "—"} />
              </div>
            )}

            <div className="mt-6 rounded-xl border p-4 bg-gray-50">
              <div className="text-xs text-gray-600 mb-1">Consejo</div>
              <p className="text-sm text-gray-700">
                Si cambias el número de rastreo por el de la paquetería, pega también la URL de seguimiento del carrier para que el cliente
                pueda abrirla desde su comprobante y la página de rastreo.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Subcomponentes
   ========================= */
function Info({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}