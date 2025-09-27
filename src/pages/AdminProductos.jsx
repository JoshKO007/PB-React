// src/pages/AdminProductos.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LockKeyhole,
  LogOut,
  Plus,
  Save,
  ImagePlus,
  Trash2,
  Tag,
  Package,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

/* =========================
   Configuración
   ========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || "";
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || ""; // ponla en Vercel

/* =========================
   Utilidades
   ========================= */
const emptyProduct = () => ({
  id: "", // text
  titulo: "",
  descripcion: "",
  descripcion_detallada: "",
  serie: "",
  precio: "",
  moneda: "MXN",
  descuento: 0,
  etiquetas: [],
  imagenes: [], // guardamos URLs absolutas
  destacado: false,
  bajo_pedido: false,
  disponible: true,
  tiempo_entreg: "",
  stock: 0,
  stripe_price_id: "",
  payment_link: "",
});

const moneyFmt = (v) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function uploadToImgBB(file) {
  if (!IMGBB_API_KEY) throw new Error("Falta VITE_IMGBB_API_KEY");
  const base64 = await fileToBase64(file);
  const fd = new FormData();
  fd.append("image", base64);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.error?.message || "No se pudo subir la imagen a ImgBB");
  }
  return json.data.url; // URL pública
}

/* =========================
   Gate por contraseña
   ========================= */
function AdminGate({ children }) {
  const [ok, setOk] = useState(false);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    const mem = localStorage.getItem("admin:auth");
    if (mem === "ok") setOk(true);
  }, []);

  const login = (e) => {
    e.preventDefault();
    if (ADMIN_PASS && pwd === ADMIN_PASS) {
      localStorage.setItem("admin:auth", "ok");
      setOk(true);
    } else {
      alert("Contraseña incorrecta");
    }
  };
  const logout = () => {
    localStorage.removeItem("admin:auth");
    setOk(false);
    setPwd("");
  };

  if (!ok) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f9f4ef]">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-amber-100 text-amber-700">
              <LockKeyhole size={18} />
            </div>
            <h1 className="text-lg font-semibold">Acceso administrativo</h1>
          </div>
          <label className="text-sm text-gray-600">Contraseña</label>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="••••••••"
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-gray-900 text-white px-3 py-2 text-sm font-semibold shadow hover:shadow-md"
          >
            Entrar
          </button>
          {!ADMIN_PASS && (
            <p className="mt-3 text-xs text-rose-600">
              Falta configurar <code>VITE_ADMIN_PASSWORD</code> en Vercel.
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f4ef]">
      <header className="w-full px-4 py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-12" />
            <div className="text-xl font-serif italic text-[#3b4d63]">Admin · Productos</div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

/* =========================
   Chips de etiquetas
   ========================= */
function TagsInput({ value = [], onChange, placeholder = "Añadir etiqueta y Enter" }) {
  const [txt, setTxt] = useState("");
  const add = () => {
    const t = txt.trim();
    if (!t) return;
    const set = new Set(value.map((v) => v.trim().toLowerCase()));
    if (!set.has(t.toLowerCase())) onChange([...(value || []), t]);
    setTxt("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(value || []).map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
          >
            <Tag size={12} /> {t}
            <button
              className="ml-1 text-gray-500 hover:text-rose-600"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
        placeholder={placeholder}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}

/* =========================
   Uploader de imágenes (ImgBB)
   ========================= */
function ImagesUploader({ urls = [], onChange }) {
  const [loading, setLoading] = useState(false);
  const canAdd = (urls?.length || 0) < 5;

  const onFiles = async (files) => {
    if (!files || files.length === 0) return;
    const remain = 5 - (urls?.length || 0);
    const toUpload = Array.from(files).slice(0, remain);
    setLoading(true);
    try {
      const uploaded = [];
      for (const f of toUpload) {
        const url = await uploadToImgBB(f);
        uploaded.push(url);
      }
      onChange([...(urls || []), ...uploaded]);
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const removeAt = (i) => onChange(urls.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {(urls || []).map((u, i) => (
          <div key={i} className="relative">
            <img
              src={u}
              alt={`img-${i}`}
              className="h-24 w-24 object-cover rounded-xl border"
              onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
            />
            <button
              onClick={() => removeAt(i)}
              className="absolute -top-2 -right-2 h-7 w-7 grid place-items-center rounded-full bg-white border shadow text-rose-600"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {canAdd && (
          <label className="h-24 w-24 grid place-items-center rounded-xl border bg-white text-gray-600 cursor-pointer hover:bg-gray-50">
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <ImagePlus size={18} />
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Máximo 5 imágenes. Se suben a ImgBB y se guarda el URL público.
      </div>
    </div>
  );
}

/* =========================
   Formulario Producto
   ========================= */
function ProductForm({ value, onChange, seriesOptions, onCreateSeries, onSave, saving }) {
  const v = value || emptyProduct();

  const set = (k, val) => onChange({ ...v, [k]: val });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package size={18} /> Datos principales
        </h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-gray-600">ID (text)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={v.id}
              onChange={(e) => set("id", e.target.value)}
              placeholder="p1 / slug único"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Título</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={v.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Nombre de la obra"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Serie</label>
            <div className="flex gap-2">
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.serie}
                onChange={(e) => set("serie", e.target.value)}
              >
                <option value="">— Sin serie —</option>
                {seriesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const s = prompt("Nueva serie:");
                  if (s) onCreateSeries(s);
                }}
                className="mt-1 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                <Plus size={14} /> Serie
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Precio</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.precio}
                onChange={(e) => set("precio", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Moneda</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.moneda}
                onChange={(e) => set("moneda", e.target.value)}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-600">Descuento (%)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.descuento}
                onChange={(e) => set("descuento", Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Stock</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.stock}
                onChange={(e) => set("stock", Number(e.target.value || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={v.destacado}
                onChange={(e) => set("destacado", e.target.checked)}
              />
              Destacado
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={v.bajo_pedido}
                onChange={(e) => set("bajo_pedido", e.target.checked)}
              />
              Bajo pedido
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={v.disponible}
                onChange={(e) => set("disponible", e.target.checked)}
              />
              Disponible
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-600">Tiempo de entrega</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={v.tiempo_entreg || v.tiempo_entrega || ""}
              onChange={(e) => set("tiempo_entreg", e.target.value)}
              placeholder="Listo para envío / Hecho bajo pedido (3 semanas)…"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Contenido & vínculos</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Descripción corta</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={v.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Descripción detallada</label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={v.descripcion_detallada}
              onChange={(e) => set("descripcion_detallada", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Etiquetas</label>
            <TagsInput
              value={v.etiquetas || []}
              onChange={(arr) => set("etiquetas", arr)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Imágenes (máx 5)</label>
            <ImagesUploader
              urls={v.imagenes || []}
              onChange={(arr) => set("imagenes", arr)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-600">Stripe price id</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.stripe_price_id}
                onChange={(e) => set("stripe_price_id", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Payment Link</label>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={v.payment_link}
                onChange={(e) => set("payment_link", e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Guardando…" : "Guardar producto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Página de Productos
   ========================= */
export default function AdminProductos() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState([]); // productos
  const [series, setSeries] = useState([]); // strings únicas
  const [editing, setEditing] = useState(emptyProduct());
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.titulo || "").toLowerCase().includes(q) ||
        (p.serie || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(
          "id,titulo,descripcion,descripcion_detallada,serie,precio,moneda,descuento,etiquetas,imagenes,destacado,bajo_pedido,disponible,tiempo_entreg,stock,stripe_price_id,payment_link,created_at,updated_at"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setList(data || []);
      const s = Array.from(
        new Set((data || []).map((r) => (r.serie || "").trim()).filter(Boolean))
      );
      setSeries(s);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startNew = () => setEditing(emptyProduct());
  const editOne = (p) => setEditing({ ...emptyProduct(), ...p });

  const upsert = async () => {
    if (!editing.id) {
      alert("El ID es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...editing,
        descuento: Number(editing.descuento || 0),
        precio: editing.precio === "" ? null : Number(editing.precio),
        stock: Number(editing.stock || 0),
        etiquetas: editing.etiquetas || [],
        imagenes: editing.imagenes || [],
        tiempo_entreg: editing.tiempo_entreg || null,
      };

      const { data, error } = await supabase
        .from("productos")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;

      // merge en lista
      const exists = list.findIndex((r) => r.id === data.id);
      let next = [...list];
      if (exists >= 0) next[exists] = data;
      else next.unshift(data);
      setList(next);

      // actualizar series
      const s = Array.from(
        new Set(next.map((r) => (r.serie || "").trim()).filter(Boolean))
      );
      setSeries(s);

      alert("Producto guardado.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const createSeries = (name) => {
    const n = name.trim();
    if (!n) return;
    if (!series.includes(n)) setSeries((prev) => [...prev, n]);
    setEditing((v) => ({ ...v, serie: n }));
  };

  return (
    <AdminGate>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestión de productos</h1>
            <p className="text-sm text-gray-600">
              Crea y edita obras, series y etiquetas. Sube hasta 5 imágenes por producto (ImgBB).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={startNew}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Plus size={16} /> Nuevo
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              title="Recargar"
            >
              <RefreshCw size={16} />
              Recargar
            </button>
          </div>
        </div>

        {/* LISTA */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Productos</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por id, título o serie…"
              className="w-full md:w-80 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Cargando…</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-700">{error}</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Título</th>
                    <th className="py-2 pr-3">Serie</th>
                    <th className="py-2 pr-3 text-right">Precio</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="py-2 pr-3">{p.id}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{p.titulo || "—"}</div>
                        <div className="text-xs text-gray-500">
                          {(p.etiquetas || []).slice(0, 3).join(", ")}
                          {(p.etiquetas?.length || 0) > 3 ? "…" : ""}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{p.serie || "—"}</td>
                      <td className="py-2 pr-3 text-right">
                        {p.precio != null ? `$${moneyFmt(p.precio)}` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="text-xs">
                          {p.disponible ? (
                            <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                              Disponible
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                              Oculto
                            </span>
                          )}
                          {p.bajo_pedido && (
                            <span className="inline-block ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
                              Bajo pedido
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => editOne(p)}
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-500">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FORM */}
        <div className="mt-6">
          <ProductForm
            value={editing}
            onChange={setEditing}
            seriesOptions={series}
            onCreateSeries={createSeries}
            onSave={upsert}
            saving={saving}
          />
        </div>
      </main>
    </AdminGate>
  );
}