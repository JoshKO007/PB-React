// src/pages/AdminRastreo.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Package,
  Search,
  CornerUpLeft,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Save,
  Loader2,
  ExternalLink,
  PencilLine,
  User2,
  Mail,
  Phone,
  BadgePercent,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

/* =========================
   Config / Supabase
   ========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PASS   = import.meta.env.VITE_ADMIN_PASSWORD || "";
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   Estados y helpers
   ========================= */
const STATUS_ORDER = [
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

function clampStatus(s) {
  return STATUS_LABEL[s] ? s : "in_transit";
}
function money(n, code = "MXN") {
  const sym = String(code).toUpperCase() === "MXN" ? "$" : "";
  const num = Number(n || 0);
  return `${sym}${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)}`;
}
function fmtDate(d) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return "—";
  }
}

/* =========================
   Página
   ========================= */
export default function AdminRastreo() {
  const navigate = useNavigate();

  // Gate de admin
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");

  // Data
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState("");
  const [error, setError] = useState("");

  const [shipments, setShipments] = useState([]);
  const [pedidosMap, setPedidosMap] = useState({});
  const [itemsByPedido, setItemsByPedido] = useState({});
  const [usersByEmail, setUsersByEmail] = useState({});

  // UI
  const [q, setQ] = useState(""); // búsqueda
  const [editFor, setEditFor] = useState(null); // { order_id, tracking_code, tracking_url, carrier, status }

  // Carga principal
  useEffect(() => {
    if (!authed) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      // 1) shipments
      const { data: ships, error: e1 } = await supabase
        .from("shipments")
        .select("order_id, tracking_code, tracking_url, carrier, status, destination, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (e1) throw e1;
      setShipments(ships || []);

      const orderIds = Array.from(new Set((ships || []).map((s) => s.order_id).filter(Boolean)));
      if (orderIds.length === 0) {
        setPedidosMap({});
        setItemsByPedido({});
        setUsersByEmail({});
        setLoading(false);
        return;
      }

      // 2) pedidos por id (sólo necesitamos email, total, moneda, created_at)
      const { data: peds, error: e2 } = await supabase
        .from("pedidos")
        .select("id, email, total, moneda, created_at")
        .in("id", orderIds);
      if (e2) throw e2;
      const pmap = (peds || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      setPedidosMap(pmap);

      // 3) pedidos_items por pedido_id
      const { data: items, error: e3 } = await supabase
        .from("pedidos_items")
        .select("pedido_id, titulo, cantidad, unit_price")
        .in("pedido_id", orderIds);
      if (e3) throw e3;
      const itemsMap = {};
      (items || []).forEach((it) => {
        itemsMap[it.pedido_id] = itemsMap[it.pedido_id] || [];
        itemsMap[it.pedido_id].push({
          titulo: it.titulo || "",
          cantidad: Number(it.cantidad || 1),
          unit_price: Number(it.unit_price || 0),
        });
      });
      setItemsByPedido(itemsMap);

      // 4) usuarios: por email (¡siempre por email!)
      const emails = Array.from(
        new Set(
          (peds || [])
            .map((p) => (p.email || "").trim().toLowerCase())
            .filter(Boolean)
        )
      );
      let uMap = {};
      if (emails.length > 0) {
        const { data: users, error: e4 } = await supabase
          .from("usuarios")
          .select("id, email, nombre, telefono")
          .in("email", emails);
        if (e4) throw e4;
        uMap = (users || []).reduce((acc, u) => {
          if (u.email) acc[String(u.email).trim().toLowerCase()] = u;
          return acc;
        }, {});
      }
      setUsersByEmail(uMap);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Arma filas hidratadas
  const rows = useMemo(() => {
    return (shipments || []).map((s) => {
      const ped = pedidosMap[s.order_id] || {};
      const items = itemsByPedido[s.order_id] || [];

      let user = null;
      if (ped.email) {
        user = usersByEmail[String(ped.email).trim().toLowerCase()] || null;
      }

      const clienteNombre = user?.nombre || null;
      const clienteEmail = ped.email || user?.email || null;
      const clienteTel = user?.telefono || null;

      const itemsResumen =
        items.length === 0
          ? "—"
          : items
              .slice(0, 3)
              .map((i) => `${i.titulo}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`)
              .join(", ") + (items.length > 3 ? `, +${items.length - 3} más` : "");

      return {
        shipment: s,
        pedido: ped,
        items,
        clienteNombre,
        clienteEmail,
        clienteTel,
        totalFmt: money(ped.total, ped.moneda),
        createdFmt: ped.created_at ? fmtDate(ped.created_at) : "—",
        status: clampStatus(s.status),
      };
    });
  }, [shipments, pedidosMap, itemsByPedido, usersByEmail]);

  // Filtro simple
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      return (
        (r.shipment.order_id || "").toLowerCase().includes(term) ||
        (r.shipment.tracking_code || "").toLowerCase().includes(term) ||
        (r.pedido.email || "").toLowerCase().includes(term) ||
        (r.clienteNombre || "").toLowerCase().includes(term) ||
        (r.items || []).some((i) => (i.titulo || "").toLowerCase().includes(term))
      );
    });
  }, [q, rows]);

  // Acciones de estado
  function idxOf(status) {
    return Math.max(0, STATUS_ORDER.findIndex((s) => s === clampStatus(status)));
  }
  async function updateStatus(order_id, newStatus) {
    try {
      setSavingRow(order_id);
      const { error } = await supabase
        .from("shipments")
        .update({ status: newStatus })
        .eq("order_id", order_id);
      if (error) throw error;
      setShipments((prev) =>
        prev.map((s) => (s.order_id === order_id ? { ...s, status: newStatus } : s))
      );
    } catch (e) {
      alert(`No se pudo actualizar el estado: ${e.message || e}`);
    } finally {
      setSavingRow("");
    }
  }
  const avanzar = (row) => {
    const i = idxOf(row.status);
    const next = STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)];
    updateStatus(row.shipment.order_id, next);
  };
  const retroceder = (row) => {
    const i = idxOf(row.status);
    const prev = STATUS_ORDER[Math.max(i - 1, 0)];
    updateStatus(row.shipment.order_id, prev);
  };
  const marcarEntregado = (row) => updateStatus(row.shipment.order_id, "delivered");

  // Edit modal
  function openEdit(row) {
    setEditFor({
      order_id: row.shipment.order_id,
      tracking_code: row.shipment.tracking_code || "",
      tracking_url: row.shipment.tracking_url || "",
      carrier: row.shipment.carrier || "",
      status: row.status || "in_transit",
    });
  }
  async function saveEdit() {
    if (!editFor) return;
    try {
      setSavingRow(editFor.order_id);
      const payload = {
        tracking_code: (editFor.tracking_code || "").trim() || null,
        tracking_url: (editFor.tracking_url || "").trim() || null,
        carrier: (editFor.carrier || "").trim() || null,
        status: clampStatus(editFor.status || "in_transit"),
      };
      const { error, data } = await supabase
        .from("shipments")
        .update(payload)
        .eq("order_id", editFor.order_id)
        .select()
        .maybeSingle();
      if (error) throw error;
      setShipments((prev) =>
        prev.map((s) => (s.order_id === editFor.order_id ? { ...s, ...payload } : s))
      );
      setEditFor(null);
    } catch (e) {
      alert(`No se pudo guardar: ${e.message || e}`);
    } finally {
      setSavingRow("");
    }
  }

  /* =========================
     Gates
     ========================= */
  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f9f4ef]">
        <div className="w-full max-w-sm bg-white rounded-2xl border shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="text-[#a16207]" />
            <h1 className="text-lg font-semibold">Admin · Envíos</h1>
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
            Entrar <CheckCircle2 size={16} />
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

  /* =========================
     UI
     ========================= */
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0eae2]/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-white border">
              <Truck className="text-[#a16207]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Administración</div>
              <div className="font-semibold truncate">Rastreo y Envíos</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
              title="Actualizar"
            >
              <Settings size={16} /> Actualizar
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
              title="Panel"
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

      {/* Barra búsqueda */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="rounded-3xl border bg-white shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por pedido, tracking, email, nombre o artículo…"
                className="pl-8 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Cargando envíos…
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-rose-50 p-6 shadow-sm text-rose-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Sin envíos.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map((r) => {
              const activeIdx = STATUS_ORDER.findIndex((s) => s === r.status);
              const pct = ((Math.min(activeIdx + 1, STATUS_ORDER.length)) / STATUS_ORDER.length) * 100;

              return (
                <motion.div
                  key={r.shipment.order_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border bg-white shadow-sm p-5"
                >
                  {/* Header fila */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Pedido</div>
                      <div className="text-lg font-semibold truncate">{r.shipment.order_id}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.createdFmt}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "delivered"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50"
                        title="Editar tracking"
                      >
                        <PencilLine size={14} /> Editar
                      </button>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User2 size={16} className="text-gray-500" />
                      <span className="truncate">
                        {r.clienteNombre || "Cliente"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail size={16} className="text-gray-500" />
                      <span className="truncate">{r.clienteEmail || "—"}</span>
                    </div>
                    {r.clienteTel && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={16} className="text-gray-500" />
                        <span className="truncate">{r.clienteTel}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700">
                      <BadgePercent size={16} className="text-gray-500" />
                      <span className="font-semibold">{r.totalFmt}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-3 text-sm text-gray-800">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-gray-600" />
                      <span className="font-medium">Artículos:</span>
                      <span className="truncate">{r.itemsResumen}</span>
                    </div>
                  </div>

                  {/* Tracking */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div className="truncate">
                      <div className="text-xs text-gray-500">Transportista</div>
                      <div className="font-medium">{r.shipment.carrier || "—"}</div>
                    </div>
                    <div className="truncate">
                      <div className="text-xs text-gray-500">Código</div>
                      <div className="font-medium break-all">{r.shipment.tracking_code || "—"}</div>
                    </div>
                    <div className="truncate">
                      <div className="text-xs text-gray-500">Enlace</div>
                      {r.shipment.tracking_url ? (
                        <a
                          href={r.shipment.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline"
                        >
                          Abrir <ExternalLink size={14} />
                        </a>
                      ) : (
                        <div className="font-medium">—</div>
                      )}
                    </div>
                  </div>

                  {/* Progreso */}
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: "tween", duration: 0.5 }}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-gray-500">
                      {STATUS_ORDER.map((s, i) => {
                        const done = i < activeIdx;
                        const active = i === activeIdx;
                        return (
                          <div key={s} className="text-center truncate">
                            <div
                              className={`mx-auto h-2 w-2 rounded-full ${
                                done
                                  ? "bg-emerald-600"
                                  : active
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-gray-300"
                              }`}
                            />
                            <div className="mt-1 leading-tight">{STATUS_LABEL[s]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Controles */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => retroceder(r)}
                      disabled={savingRow === r.shipment.order_id || idxOf(r.status) === 0}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} /> Retroceder
                    </button>
                    <button
                      onClick={() => avanzar(r)}
                      disabled={
                        savingRow === r.shipment.order_id ||
                        idxOf(r.status) === STATUS_ORDER.length - 1
                      }
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                    >
                      Avanzar <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => marcarEntregado(r)}
                      disabled={savingRow === r.shipment.order_id || r.status === "delivered"}
                      className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-3 py-1.5 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
                    >
                      {savingRow === r.shipment.order_id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Marcar entregado
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <AnimatePresence>
        {!!editFor && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="text-[#a16207]" />
                  <h3 className="text-lg font-semibold">Editar envío</h3>
                </div>
                <button
                  onClick={() => setEditFor(null)}
                  className="rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs text-gray-600">Transportista</label>
                  <input
                    value={editFor.carrier}
                    onChange={(e) => setEditFor((f) => ({ ...f, carrier: e.target.value }))}
                    placeholder="Ej. DHL / Estafeta / UPS…"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Código de rastreo</label>
                  <input
                    value={editFor.tracking_code}
                    onChange={(e) => setEditFor((f) => ({ ...f, tracking_code: e.target.value }))}
                    placeholder="1Z999AA10123456784"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 break-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Enlace del rastreo</label>
                  <input
                    value={editFor.tracking_url}
                    onChange={(e) => setEditFor((f) => ({ ...f, tracking_url: e.target.value }))}
                    placeholder="https://transportista.com/track/..."
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Estado</label>
                  <select
                    value={editFor.status}
                    onChange={(e) => setEditFor((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                    <option value="exception">{STATUS_LABEL.exception}</option>
                    <option value="returned">{STATUS_LABEL.returned}</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditFor(null)}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingRow === editFor.order_id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold hover:bg-[#854d06] disabled:opacity-50"
                >
                  {savingRow === editFor.order_id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Guardar cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}