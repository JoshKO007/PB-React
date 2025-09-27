// src/pages/AdminProductos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  Lock,
  LogOut,
  Plus,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
  UploadCloud,
  Pencil,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

/* =========================
   ENV / Clients
   ========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASS =
  import.meta.env.VITE_ADMIN_PASS ||
  import.meta.env.VITE_ADMIN_PASSWORD ||
  "";

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY || "";

/* =========================
   Helpers
   ========================= */
const money = (n) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

function parseTags(v) {
  if (Array.isArray(v)) return v;
  return String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function tagsToInput(v) {
  if (!Array.isArray(v)) return "";
  return v.join(", ");
}

function isHttp(url) {
  return /^https?:\/\//i.test(url || "");
}

/* Normaliza para mostrar en frontend (soporta URLs completas o rutas locales) */
function previewSrc(raw) {
  if (!raw) return "/placeholder.jpg";
  if (isHttp(raw)) return raw;
  let cleaned = String(raw).replace(/^public\//, "");
  if (!/^obras\//.test(cleaned)) cleaned = `obras/${cleaned}`;
  return `/${cleaned}`;
}

/* Lee archivo como base64 (requerido por ImgBB) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/* Sube un archivo a ImgBB y devuelve la URL pública */
async function uploadToImgBB(file) {
  if (!IMGBB_KEY) throw new Error("Falta VITE_IMGBB_API_KEY");
  const base64 = await fileToBase64(file);

  const form = new FormData();
  form.append("key", IMGBB_KEY);
  form.append("image", base64);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.error?.message || "Fallo al subir a ImgBB");
  }
  return json.data.url; // URL pública
}

/* =========================
   Página
   ========================= */
export default function AdminProductos() {
  const navigate = useNavigate();

  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);

  // Form ligado a tu tabla 'productos'
  const [form, setForm] = useState({
    id: "",
    titulo: "",
    descripcion: "",
    descripcion_detallada: "",
    serie: "",
    precio: "",
    moneda: "MXN",
    descuento: 0,
    etiquetas: [],
    imagenes: [],
    destacado: false,
    bajo_pedido: false,
    disponible: true,
    tiempo_entrega: "",
    stock: 0,
    stripe_price_id: "",
    payment_link_url: "",
  });

  const canSave =
    form.id &&
    form.titulo &&
    String(form.moneda).length > 0 &&
    !Number.isNaN(Number(form.precio));

  /* ---------- Auth simple por contraseña ---------- */
  useEffect(() => {
    try {
      const ok = localStorage.getItem("admin_ok") === "1";
      setAuthed(ok);
    } catch {}
  }, []);

  const onLogin = () => {
    if (!ADMIN_PASS) {
      setPassError("Falta configurar VITE_ADMIN_PASS en Vercel.");
      return;
    }
    if (pass === ADMIN_PASS) {
      setAuthed(true);
      setPassError("");
      try {
        localStorage.setItem("admin_ok", "1");
      } catch {}
    } else {
      setPassError("Contraseña incorrecta.");
    }
  };

  const onLogout = () => {
    setAuthed(false);
    try {
      localStorage.removeItem("admin_ok");
    } catch {}
  };

  /* ---------- Cargar listado ---------- */
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("productos")
        .select(
          "id,titulo,precio,moneda,descuento,imagenes,destacado,bajo_pedido,disponible,serie,stock,tiempo_entrega,updated_at"
        )
        .order("updated_at", { ascending: false });
      if (e) throw e;
      setList(data || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  /* ---------- Editar / Nuevo ---------- */
  const resetForm = () =>
    setForm({
      id: "",
      titulo: "",
      descripcion: "",
      descripcion_detallada: "",
      serie: "",
      precio: "",
      moneda: "MXN",
      descuento: 0,
      etiquetas: [],
      imagenes: [],
      destacado: false,
      bajo_pedido: false,
      disponible: true,
      tiempo_entrega: "",
      stock: 0,
      stripe_price_id: "",
      payment_link_url: "",
    });

  const onEdit = async (row) => {
    setEditingId(row.id);
    try {
      const { data, error: e } = await supabase
        .from("productos")
        .select("*")
        .eq("id", row.id)
        .single();
      if (e) throw e;

      setForm({
        id: data.id || "",
        titulo: data.titulo || "",
        descripcion: data.descripcion || "",
        descripcion_detallada: data.descripcion_detallada || "",
        serie: data.serie || "",
        precio: data.precio ?? "",
        moneda: data.moneda || "MXN",
        descuento: data.descuento ?? 0,
        etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : [],
        imagenes: Array.isArray(data.imagenes) ? data.imagenes : [],
        destacado: !!data.destacado,
        bajo_pedido: !!data.bajo_pedido,
        disponible: !!data.disponible,
        tiempo_entrega: data.tiempo_entrega || "",
        stock: data.stock ?? 0,
        stripe_price_id: data.stripe_price_id || "",
        payment_link_url: data.payment_link_url || "",
      });
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const onNew = () => {
    setEditingId(null);
    resetForm();
  };

  /* ---------- Guardar (upsert) ---------- */
  const onSave = async () => {
    if (!canSave) return;

    const payload = {
      id: String(form.id).trim(),
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      descripcion_detallada: form.descripcion_detallada || null,
      serie: form.serie || null,
      precio: Number(form.precio),
      moneda: form.moneda || "MXN",
      descuento: Number(form.descuento || 0),
      etiquetas: form.etiquetas || [],
      imagenes: form.imagenes || [],
      destacado: !!form.destacado,
      bajo_pedido: !!form.bajo_pedido,
      disponible: !!form.disponible,
      tiempo_entrega: form.tiempo_entrega || null,
      stock: Number(form.stock || 0),
      stripe_price_id: form.stripe_price_id || null,
      payment_link_url: form.payment_link_url || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: e } = await supabase.from("productos").upsert(payload, {
        onConflict: "id",
      });
      if (e) throw e;
      await load();
      onNew();
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  /* ---------- Borrar ---------- */
  const onDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      const { error: e } = await supabase.from("productos").delete().eq("id", id);
      if (e) throw e;
      if (editingId === id) onNew();
      await load();
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  /* ---------- Imagenes (máx 5) ---------- */
  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      // Límite de 5 total
      const remaining = Math.max(0, 5 - (form.imagenes?.length || 0));
      const toUpload = files.slice(0, remaining);

      const urls = [];
      for (const f of toUpload) {
        const url = await uploadToImgBB(f);
        urls.push(url);
      }
      setForm((s) => ({ ...s, imagenes: [...(s.imagenes || []), ...urls] }));
    } catch (e2) {
      setError(String(e2.message || e2));
    } finally {
      e.target.value = "";
    }
  };

  const removeImageAt = (idx) => {
    setForm((s) => ({
      ...s,
      imagenes: (s.imagenes || []).filter((_, i) => i !== idx),
    }));
  };

  const moveImage = (from, to) => {
    setForm((s) => {
      const arr = [...(s.imagenes || [])];
      if (to < 0 || to >= arr.length) return s;
      const [el] = arr.splice(from, 1);
      arr.splice(to, 0, el);
      return { ...s, imagenes: arr };
    });
  };

  if (!authed) {
    return (
      <div className="min-h-[80vh] grid place-items-center bg-[#f9f4ef] px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="h-9 w-9 grid place-items-center rounded-full bg-amber-100 text-amber-700">
              <Lock size={18} />
            </span>
            Acceso administrativo
          </div>

          <label className="block text-sm mt-4 text-gray-600">Contraseña</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setPassError("");
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="••••••••"
          />
          {passError && (
            <div className="mt-2 text-xs text-rose-600">{passError}</div>
          )}

          <button
            onClick={onLogin}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f4ef]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f9f4ef]/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-10" alt="logo" />
            <div className="text-lg font-semibold text-[#3b4d63]">
              Panel de administración
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-white"
              title="Menú admin"
            >
              <ArrowLeft size={16} /> Admin
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-white"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listado */}
        <div className="lg:col-span-2 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Productos</h2>
            <div className="flex gap-2">
              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                title="Refrescar"
              >
                <RefreshCw size={16} /> Actualizar
              </button>
              <button
                onClick={onNew}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-3 py-1.5 text-sm font-semibold shadow hover:shadow-md"
              >
                <Plus size={16} /> Nuevo
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Cargando…</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-700">{error}</div>
          ) : list.length === 0 ? (
            <div className="mt-4 text-sm">Sin productos.</div>
          ) : (
            <div className="mt-4 divide-y">
              {list.map((p) => {
                const first = (p.imagenes || [])[0];
                return (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    <img
                      src={previewSrc(first)}
                      alt={p.titulo}
                      className="h-12 w-12 rounded object-cover border"
                      onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.titulo}</div>
                      <div className="text-xs text-gray-500">
                        {p.id} • {p.serie || "—"} • {p.moneda} ${money(p.precio)}
                        {p.descuento ? ` (−${p.descuento}%)` : ""} •{" "}
                        {p.disponible ? "Disponible" : "No disponible"}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => onEdit(p)}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} /> Borrar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            {editingId ? `Editar (${editingId})` : "Nuevo producto"}
          </h2>

          {/* id */}
          <label className="block text-sm mt-3 text-gray-600">
            ID (ej. p9)
          </label>
          <input
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="p9"
          />

          {/* titulo */}
          <label className="block text-sm mt-3 text-gray-600">Título</label>
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Nombre de la obra"
          />

          {/* descripcion */}
          <label className="block text-sm mt-3 text-gray-600">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) =>
              setForm({ ...form, descripcion: e.target.value })
            }
            rows={2}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Descripción corta"
          />

          {/* descripcion_detallada */}
          <label className="block text-sm mt-3 text-gray-600">
            Descripción detallada
          </label>
          <textarea
            value={form.descripcion_detallada}
            onChange={(e) =>
              setForm({ ...form, descripcion_detallada: e.target.value })
            }
            rows={3}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Ficha técnica, técnica, etc."
          />

          {/* serie */}
          <label className="block text-sm mt-3 text-gray-600">Serie</label>
          <input
            value={form.serie}
            onChange={(e) => setForm({ ...form, serie: e.target.value })}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Serie 1 / Serie 2 / Serie 3"
          />

          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* precio */}
            <div>
              <label className="block text-sm text-gray-600">Precio</label>
              <input
                type="number"
                step="0.01"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="0.00"
              />
            </div>

            {/* moneda */}
            <div>
              <label className="block text-sm text-gray-600">Moneda</label>
              <input
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="MXN"
              />
            </div>
          </div>

          {/* descuento */}
          <label className="block text-sm mt-3 text-gray-600">
            Descuento (%)
          </label>
          <input
            type="number"
            value={form.descuento}
            onChange={(e) =>
              setForm({ ...form, descuento: Number(e.target.value || 0) })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="0"
          />

          {/* etiquetas */}
          <label className="block text-sm mt-3 text-gray-600">
            Etiquetas (separadas por coma)
          </label>
          <input
            value={tagsToInput(form.etiquetas)}
            onChange={(e) =>
              setForm({ ...form, etiquetas: parseTags(e.target.value) })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="acrílico, paisaje"
          />

          {/* switches */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.destacado}
                onChange={(e) =>
                  setForm({ ...form, destacado: e.target.checked })
                }
              />
              Destacado
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.bajo_pedido}
                onChange={(e) =>
                  setForm({ ...form, bajo_pedido: e.target.checked })
                }
              />
              Bajo pedido
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.disponible}
                onChange={(e) =>
                  setForm({ ...form, disponible: e.target.checked })
                }
              />
              Disponible
            </label>
          </div>

          {/* tiempo_entrega */}
          <label className="block text-sm mt-3 text-gray-600">
            Tiempo de entrega
          </label>
          <input
            value={form.tiempo_entrega}
            onChange={(e) =>
              setForm({ ...form, tiempo_entrega: e.target.value })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Listo para envío / Hecho bajo pedido (3 semanas)"
          />

          {/* stock */}
          <label className="block text-sm mt-3 text-gray-600">Stock</label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) =>
              setForm({ ...form, stock: Number(e.target.value || 0) })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="0"
          />

          {/* stripe_price_id / payment_link_url (opcional) */}
          <label className="block text-sm mt-3 text-gray-600">
            Stripe price ID (opcional)
          </label>
          <input
            value={form.stripe_price_id}
            onChange={(e) =>
              setForm({ ...form, stripe_price_id: e.target.value })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="price_123"
          />

          <label className="block text-sm mt-3 text-gray-600">
            Payment link URL (opcional)
          </label>
          <input
            value={form.payment_link_url}
            onChange={(e) =>
              setForm({ ...form, payment_link_url: e.target.value })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="https://buy.stripe.com/..."
          />

          {/* Imágenes */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Imágenes (máx. 5)</label>
              <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 cursor-pointer">
                <UploadCloud size={14} />
                Subir a ImgBB
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickImages}
                />
              </label>
            </div>

            {(!form.imagenes || form.imagenes.length === 0) ? (
              <div className="mt-2 h-28 grid place-items-center rounded-xl border text-gray-500 text-sm">
                <ImageIcon size={16} /> Sin imágenes
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-3">
                {form.imagenes.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={previewSrc(src)}
                      alt={`img-${idx}`}
                      className="h-28 w-full object-cover rounded-xl border"
                      onError={(e) =>
                        (e.currentTarget.src = "/placeholder.jpg")
                      }
                    />
                    <div className="absolute inset-x-0 -bottom-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => moveImage(idx, idx - 1)}
                        className="h-7 w-7 grid place-items-center rounded-full bg-white border shadow"
                        title="Mover izq"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        onClick={() => moveImage(idx, idx + 1)}
                        className="h-7 w-7 grid place-items-center rounded-full bg-white border shadow"
                        title="Mover der"
                      >
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => removeImageAt(idx)}
                        className="h-7 w-7 grid place-items-center rounded-full bg-white border text-rose-600 shadow"
                        title="Quitar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Se guardan las URLs públicas devueltas por ImgBB.
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              disabled={!canSave}
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
            >
              <Save size={16} /> {editingId ? "Guardar cambios" : "Crear"}
            </button>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Plus size={16} /> Nuevo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}