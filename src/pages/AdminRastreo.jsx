// src/pages/AdminRastreo.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Package, CornerUpLeft, LogOut, Loader2, Search, BadgeCheck,
  CheckCircle2, RefreshCw, FastForward, Rewind, Save, ExternalLink, Link as LinkIcon,
  CalendarDays, MapPin, Hash as HashIcon, PencilLine, Plus, Trash2,
  User as UserIcon, Mail, Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

/* =========================
   Config / Supabase
   ========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PASS   = import.meta.env.VITE_ADMIN_PASSWORD || "";
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   Estados de envío
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
const STATUS_LABELS = {
  created: "Creado",
  paid: "Pagado",
  packed: "Empacado",
  shipped: "Enviado",
  in_transit: "En tránsito",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
};

/* =========================
   Utilidades
   ========================= */
const money = (n, code = "MXN") => {
  const sym = String(code).toUpperCase() === "MXN" ? "$" : "";
  return `${sym}${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0))}`;
};
const nextStatus = (s) => {
  const i = STATUS_ORDER.indexOf(s);
  if (i < 0) return "created";
  return STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)];
};
const prevStatus = (s) => {
  const i = STATUS_ORDER.indexOf(s);
  if (i < 0) return "created";
  return STATUS_ORDER[Math.max(i - 1, 0)];
};

/* =========================
   Componente
   ========================= */
export default function AdminRastreo() {
  const navigate = useNavigate();

  // Gate simple de admin
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");

  // Datos base
  const [shipments, setShipments] = useState([]);
  const [pedidosMap, setPedidosMap] = useState({});       // order_id -> pedido
  const [itemsByPedido, setItemsByPedido] = useState({}); // order_id -> [{titulo, cantidad, unit_price}]
  const [usersById, setUsersById] = useState({});         // user_id -> usuario
  const [usersByEmail, setUsersByEmail] = useState({});   // email -> usuario

  // Estados UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  // Editor
  const blankForm = {
    id: null,               // UUID shipments
    order_id: "",
    carrier: "",
    tracking_code: "",
    tracking_url: "",
    status: "created",
    eta: "",
    origin: "",
    destination: "",
  };
  const [form, setForm] = useState(blankForm);

  /* ===== Cargar lista + datos relacionados ===== */
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Envíos
      const { data: ships, error: e1 } = await supabase
        .from("shipments")
        .select("id, order_id, carrier, tracking_code, tracking_url, status, eta, origin, destination, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (e1) throw e1;
      setShipments(ships || []);

      const orderIds = Array.from(new Set((ships || []).map((s) => s.order_id).filter(Boolean)));
      if (orderIds.length === 0) {
        setPedidosMap({});
        setItemsByPedido({});
        setUsersById({});
        setUsersByEmail({});
        return;
      }

      // 2) Pedidos (para total/moneda/email/posible user_id/nombre si existe)
      const { data: peds, error: e2 } = await supabase
        .from("pedidos")
        .select("id, email, total, moneda, created_at, user_id, nombre, cliente_nombre")
        .in("id", orderIds);
      if (e2) throw e2;

      const pedMap = (peds || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      setPedidosMap(pedMap);

      // 3) Items de cada pedido
      const { data: items, error: e3 } = await supabase
        .from("pedidos_items")
        .select("pedido_id, titulo, cantidad, unit_price")
        .in("pedido_id", orderIds);
      if (e3) throw e3;

      const byPed = {};
      (items || []).forEach((it) => {
        const arr = byPed[it.pedido_id] || [];
        arr.push({
          titulo: it.titulo,
          cantidad: Number(it.cantidad || 1),
          unit_price: Number(it.unit_price || 0),
        });
        byPed[it.pedido_id] = arr;
      });
      setItemsByPedido(byPed);

      // 4) Usuarios: por user_id y por email
      const userIds = Array.from(
        new Set(
          (peds || [])
            .map((p) => p.user_id)
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        )
      );
      const emails = Array.from(
        new Set(
          (peds || [])
            .map((p) => (p.email || "").trim().toLowerCase())
            .filter(Boolean)
        )
      );

      // Por ID
      let usersIdMap = {};
      if (userIds.length > 0) {
        const { data: usersByIdData, error: e4 } = await supabase
          .from("usuarios")
          .select("id, email, nombre, telefono")
          .in("id", userIds);
        if (e4) throw e4;
        usersIdMap = (usersByIdData || []).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }
      setUsersById(usersIdMap);

      // Por email
      let usersEmailMap = {};
      if (emails.length > 0) {
        const { data: usersByEmailData, error: e5 } = await supabase
          .from("usuarios")
          .select("id, email, nombre, telefono")
          .in("email", emails);
        if (e5) throw e5;
        usersEmailMap = (usersByEmailData || []).reduce((acc, u) => {
          if (u.email) acc[String(u.email).trim().toLowerCase()] = u;
          return acc;
        }, {});
      }
      setUsersByEmail(usersEmailMap);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Fusión de datos por envío (función helper)
  const hydrateRow = (s) => {
    const ped = pedidosMap[s.order_id] || {};
    const items = itemsByPedido[s.order_id] || [];

    // Resolver usuario: primero por user_id, luego por email
    let user = null;
    if (ped.user_id && usersById[ped.user_id]) {
      user = usersById[ped.user_id];
    } else if (ped.email) {
      user = usersByEmail[String(ped.email).trim().toLowerCase()] || null;
    }

    const clienteNombre =
      user?.nombre || ped.nombre || ped.cliente_nombre || null;
    const clienteEmail =
      user?.email || ped.email || null;
    const clienteTelefono = user?.telefono || null;

    return {
      shipment: s,
      pedido: ped,
      items,
      user: user,
      clienteNombre,
      clienteEmail,
      clienteTelefono,
      totalFmt: money(ped.total, ped.moneda),
      itemsResumen:
        items.length === 0
          ? "—"
          : items
              .slice(0, 3)
              .map((i) => `${i.titulo}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`)
              .join(", ") + (items.length > 3 ? `, +${items.length - 3} más` : ""),
    };
  };

  // Listado filtrado con datos fusionados
  const merged = useMemo(() => shipments.map(hydrateRow), [shipments, pedidosMap, itemsByPedido, usersById, usersByEmail]);

  const filtered = useMemo(() => {
    const term = (q || "").toLowerCase().trim();
    if (!term) return merged;
    return merged.filter(({ shipment: s, pedido: p, items, clienteNombre, clienteEmail }) => {
      const itemsText = items.map(i => i.titulo || "").join(" • ").toLowerCase();
      return (
        (s.order_id || "").toLowerCase().includes(term) ||
        (s.tracking_code || "").toLowerCase().includes(term) ||
        (s.carrier || "").toLowerCase().includes(term) ||
        (s.status || "").toLowerCase().includes(term) ||
        (clienteNombre || "").toLowerCase().includes(term) ||
        (clienteEmail || "").toLowerCase().includes(term) ||
        itemsText.includes(term)
      );
    });
  }, [merged, q]);

  /* ===== Acciones editor ===== */
  const resetForm = () => setForm(blankForm);
  const onEdit = (row) => {
    const s = row.shipment || row; // acepta merged o shipment puro
    setForm({
      id: s.id || null,
      order_id: s.order_id || "",
      carrier: s.carrier || "",
      tracking_code: s.tracking_code || "",
      tracking_url: s.tracking_url || "",
      status: s.status || "created",
      eta: s.eta || "",
      origin: s.origin || "",
      destination: s.destination || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onNewFromOrder = (orderId) => {
    setForm({ ...blankForm, order_id: orderId || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!form.order_id) throw new Error("Debes indicar un ID de pedido (order_id).");
      if (!form.tracking_code) throw new Error("Debes indicar un código de rastreo.");

      const payload = {
        order_id: form.order_id.trim(),
        carrier: (form.carrier || "").trim() || null,
        tracking_code: (form.tracking_code || "").trim(),
        tracking_url: (form.tracking_url || "").trim() || null,
        status: STATUS_ORDER.includes(form.status) ? form.status : "in_transit",
        eta: (form.eta || "").trim() || null,
        origin: (form.origin || "").trim() || null,
        destination: (form.destination || "").trim() || null,
      };

      if (form.id) {
        // update
        const { data, error } = await supabase
          .from("shipments")
          .update(payload)
          .eq("id", form.id)
          .select()
          .single();
        if (error) throw error;
        setShipments((prev) => prev.map((x) => (x.id === form.id ? data : x)));
      } else {
        // Insert o upsert por order_id
        const { data: existing, error: e0 } = await supabase
          .from("shipments")
          .select("id")
          .eq("order_id", payload.order_id)
          .maybeSingle();
        if (e0) throw e0;

        if (existing?.id) {
          const { data, error } = await supabase
            .from("shipments")
            .update(payload)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          setShipments((prev) => prev.map((x) => (x.id === existing.id ? data : x)));
        } else {
          const { data, error } = await supabase
            .from("shipments")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          setShipments((prev) => [data, ...prev]);
        }
      }

      resetForm();
      // refrescar todo para re-vincular usuario/items/pedido
      await loadAll();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const s = row.shipment || row;
    if (!confirm(`¿Eliminar el envío del pedido “${s.order_id}”?`)) return;
    try {
      setDeleting(s.id);
      const { error } = await supabase.from("shipments").delete().eq("id", s.id);
      if (error) throw error;
      setShipments((prev) => prev.filter((x) => x.id !== s.id));
      if (form.id === s.id) resetForm();
    } catch (e) {
      alert(`No se pudo eliminar: ${e.message || e}`);
    } finally {
      setDeleting("");
    }
  };

  const setStatusNext = () => setForm((f) => ({ ...f, status: nextStatus(f.status) }));
  const setStatusPrev = () => setForm((f) => ({ ...f, status: prevStatus(f.status) }));
  const setStatusDelivered = () => setForm((f) => ({ ...f, status: "delivered" }));

  /* =========================
     Gate de contraseña
     ========================= */
  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f9f4ef]">
        <div className="w-full max-w-sm bg-white rounded-2xl border shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="text-[#a16207]" />
            <h1 className="text-lg font-semibold">Admin · Rastreo</h1>
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
            Entrar <BadgeCheck size={16} />
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-white border">
              <Truck className="text-[#a16207]" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Administración</div>
              <div className="font-semibold">Rastreo de envíos</div>
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

      {/* Layout 2 columnas */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_1px_1.2fr] gap-6">
        {/* Col izquierda: Editor */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-white shadow-sm p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="text-[#a16207]" />
                <h2 className="text-lg font-semibold">
                  {form.id ? "Editar envío" : "Crear/actualizar envío"}
                </h2>
              </div>
              <button
                onClick={loadAll}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                title="Refrescar"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>

            {/* Errores */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <div className="mt-4 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <HashIcon size={14} /> ID de pedido (order_id)
                  </label>
                  <input
                    value={form.order_id}
                    onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
                    placeholder="Ej. AB12C3D4E5"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <LinkIcon size={14} /> Código de rastreo
                  </label>
                  <input
                    value={form.tracking_code}
                    onChange={(e) => setForm((f) => ({ ...f, tracking_code: e.target.value }))}
                    placeholder="Ej. 1Z999AA10123456784"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Transportista</label>
                  <input
                    value={form.carrier}
                    onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                    placeholder="Ej. FedEx, DHL, Estafeta…"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">URL de rastreo (opcional)</label>
                  <input
                    value={form.tracking_url}
                    onChange={(e) => setForm((f) => ({ ...f, tracking_url: e.target.value }))}
                    placeholder="https://…"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <CalendarDays size={14} /> Estimación de entrega (ETA)
                  </label>
                  <input
                    value={form.eta}
                    onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))}
                    placeholder="Fecha u observación (opcional)"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-amber-200"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={setStatusPrev}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      title="Retroceder estado"
                    >
                      <Rewind size={14} /> Atrás
                    </button>
                    <button
                      onClick={setStatusNext}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      title="Avanzar estado"
                    >
                      <FastForward size={14} /> Adelante
                    </button>
                    <button
                      onClick={setStatusDelivered}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110"
                      title="Marcar como entregado"
                    >
                      <CheckCircle2 size={14} /> Entregado
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin size={14} /> Origen
                  </label>
                  <input
                    value={form.origin}
                    onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                    placeholder="Ciudad, Estado (opcional)"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin size={14} /> Destino
                  </label>
                  <input
                    value={form.destination}
                    onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                    placeholder="Ciudad, Estado (opcional)"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold hover:bg-[#854d06] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {form.id ? "Guardar cambios" : "Crear/actualizar"}
                </button>
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-gray-200 rounded-full" />

        {/* Col derecha: listado fusionado */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-white shadow-sm p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Truck className="text-[#a16207]" />
                <h2 className="text-lg font-semibold">Envíos</h2>
              </div>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por cliente, pedido, código, transportista, estado, artículo…"
                  className="pl-7 w-80 rounded-full border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="animate-spin" size={16} /> Cargando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-6 text-sm text-gray-600">
                No hay envíos. Puedes crear uno desde el editor indicando el <b>order_id</b>.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((row) => {
                  const { shipment: s, pedido: p, items, clienteNombre, clienteEmail, clienteTelefono, totalFmt } = row;

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border overflow-hidden bg-white shadow-sm flex flex-col"
                    >
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <UserIcon size={14} />
                            <span className="font-medium truncate max-w-[190px]" title={clienteNombre || clienteEmail || "Cliente"}>
                              {clienteNombre || clienteEmail || "Cliente"}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.status === "delivered"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {STATUS_LABELS[s.status] || s.status}
                          </span>
                        </div>

                        {/* Datos cliente */}
                        <div className="text-[12px] text-gray-600 flex flex-col gap-0.5">
                          {clienteEmail && (
                            <div className="inline-flex items-center gap-1">
                              <Mail size={12} /> <span className="truncate">{clienteEmail}</span>
                            </div>
                          )}
                          {clienteTelefono && (
                            <div className="inline-flex items-center gap-1">
                              <Phone size={12} /> <span className="truncate">{clienteTelefono}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">Pedido</div>
                        <div className="font-semibold truncate">{s.order_id}</div>

                        {/* Lo que pidió */}
                        <div className="mt-1 text-sm">
                          <div className="text-gray-600">Lo que pidió</div>
                          <div className="font-medium line-clamp-2">
                            {row.itemsResumen}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="mt-1 text-sm">
                          <div className="text-gray-600">Total</div>
                          <div className="font-semibold">{totalFmt}</div>
                        </div>

                        {/* Carrier/Tracking */}
                        <div className="mt-2 text-xs text-gray-600">
                          <div className="flex items-center justify-between">
                            <span>Transportista</span>
                            <span className="font-medium">{s.carrier || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Código</span>
                            <span className="font-medium break-all">{s.tracking_code || "—"}</span>
                          </div>
                          {s.tracking_url && (
                            <a
                              href={s.tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-700 hover:underline"
                            >
                              Ver rastreo <ExternalLink size={14} />
                            </a>
                          )}
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onEdit(row)}
                              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50"
                              title="Editar"
                            >
                              <PencilLine size={14} /> Modificar
                            </button>
                            <button
                              onClick={() => onNewFromOrder(s.order_id)}
                              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50"
                              title="Nuevo con este pedido"
                            >
                              <Plus size={14} /> Nuevo
                            </button>
                          </div>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={deleting === s.id}
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 text-rose-600 disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deleting === s.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}