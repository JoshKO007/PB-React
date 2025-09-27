// src/pages/AdminProductos.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  Plus,
  Image as ImageIcon,
  Trash2,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  ArrowLeft,
} from "lucide-react";

/* ====== Config ====== */
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "";
const ADMIN_PASS    = import.meta.env.VITE_ADMIN_PASSWORD || import.meta.env.VITE_ADMIN_PASS || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ====== Helpers ====== */
const moneyFmt = (n) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

function validTag(s) {
  return /^[\p{L}\p{N}_-]+$/u.test(s);
}
async function uploadToImgBB(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.error?.message || "Error subiendo imagen");
  }
  return json.data.display_url || json.data.url;
}

/* ====== Gate ====== */
export default function AdminProductos() {
  const [inputPass, setInputPass] = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [authed, setAuthed]       = useState(false);

  useEffect(() => {
    const ok = sessionStorage.getItem("admin:ok") === "1";
    setAuthed(ok);
  }, []);

  const tryLogin = (e) => {
    e?.preventDefault?.();
    if (!ADMIN_PASS) {
      alert("Falta configurar VITE_ADMIN_PASSWORD en Vercel.");
      return;
    }
    if (inputPass === ADMIN_PASS) {
      sessionStorage.setItem("admin:ok", "1");
      setAuthed(true);
    } else {
      alert("Contraseña incorrecta.");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-[70vh] grid place-items-center bg-[#f9f4ef] px-4">
        <form
          onSubmit={tryLogin}
          className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-amber-100 text-amber-700">
              <LockKeyhole size={18} />
            </div>
            Acceso administrativo
          </div>

          <label className="block text-sm text-gray-600 mt-4">Contraseña</label>
          <div className="mt-1 flex items-center rounded-xl border px-3">
            <input
              type={showPass ? "text" : "password"}
              value={inputPass}
              onChange={(e) => setInputPass(e.target.value)}
              className="w-full py-2 text-sm outline-none"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="text-gray-500 hover:text-gray-700"
              title={showPass ? "Ocultar" : "Mostrar"}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {!ADMIN_PASS && (
            <p className="text-xs text-rose-600 mt-2">
              Falta configurar <strong>VITE_ADMIN_PASSWORD</strong> en Vercel.
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-gray-900 text-white py-2 text-sm font-semibold"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return <ProductosAdminUI />;
}

/* ====== Página ====== */
function ProductosAdminUI() {
  const navigate = useNavigate();

  // listado
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // form state (crear/editar)
  const [editingId, setEditingId] = useState(null); // id (text) de BD cuando se edita
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg]     = useState("");
  const [errMsg, setErrMsg]   = useState("");

  // Series (distinct)
  const [series, setSeries]           = useState([]);
  const [serieSel, setSerieSel]       = useState("");
  const [serieNueva, setSerieNueva]   = useState("");

  // Campos
  const [titulo, setTitulo]                         = useState("");
  const [descripcion, setDescripcion]               = useState("");
  const [descripcionDetallada, setDescripcionDetallada] = useState("");
  const [precio, setPrecio]                         = useState("");
  const [moneda, setMoneda]                         = useState("MXN");
  const [descuento, setDescuento]                   = useState(0);
  const [bajoPedido, setBajoPedido]                 = useState(false);
  const [tiempoEntrega, setTiempoEntrega]           = useState("Listo para envío");
  const [stock, setStock]                           = useState(1);

  // Etiquetas
  const [tagInput, setTagInput] = useState("");
  const [etiquetas, setEtiquetas] = useState([]);

  // Imágenes: urls existentes (cuando editas) + nuevos files (se suben al guardar)
  const [imgUrls, setImgUrls] = useState([]); // string[]
  const [filesNew, setFilesNew] = useState([]); // File[]
  const fileInputRef = useRef(null);

  /* ==== Load list & series ==== */
  const fetchList = async () => {
    setListLoading(true);
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id,titulo,precio,moneda,stock,serie,imagenes,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };
  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("serie")
        .not("serie", "is", null);
      if (error) throw error;
      const uniq = Array.from(new Set((data || []).map((r) => (r.serie || "").trim()).filter(Boolean)));
      setSeries(uniq);
    } catch (e) {
      console.warn("No se pudieron cargar series:", e);
    }
  };
  useEffect(() => {
    fetchList();
    fetchSeries();
  }, []);

  /* ==== Helpers UI ==== */
  const resetForm = () => {
    setEditingId(null);
    setTitulo("");
    setDescripcion("");
    setDescripcionDetallada("");
    setPrecio("");
    setMoneda("MXN");
    setDescuento(0);
    setBajoPedido(false);
    setTiempoEntrega("Listo para envío");
    setStock(1);
    setEtiquetas([]);
    setImgUrls([]);
    setFilesNew([]);
    setSerieSel("");
    setSerieNueva("");
  };

  const loadForEdit = async (id) => {
    setLoading(true);
    setOkMsg("");
    setErrMsg("");
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setEditingId(data.id);
      setTitulo(data.titulo || "");
      setDescripcion(data.descripcion || "");
      setDescripcionDetallada(data.descripcion_detallada || "");
      setPrecio(String(data.precio ?? ""));
      setMoneda((data.moneda || "MXN").toUpperCase());
      setDescuento(Number(data.descuento || 0));
      setBajoPedido(!!data.bajo_pedido);
      setTiempoEntrega(data.tiempo_entrega || "Listo para envío");
      setStock(Math.max(0, Number(data.stock || 0)));
      setEtiquetas(Array.isArray(data.etiquetas) ? data.etiquetas : []);
      setImgUrls(Array.isArray(data.imagenes) ? data.imagenes : []);
      setFilesNew([]);
      setSerieSel(data.serie || "");
    } catch (e) {
      setErrMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async (id) => {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
    try {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;
      if (editingId === id) resetForm();
      fetchList();
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  /* ==== Series ==== */
  const addSerie = () => {
    const s = (serieNueva || "").trim();
    if (!s) return;
    if (!series.includes(s)) setSeries((prev) => [...prev, s]);
    setSerieSel(s);
    setSerieNueva("");
  };

  /* ==== Tags ==== */
  const onAddTag = () => {
    const raw = (tagInput || "").trim();
    if (!raw) return;
    if (!validTag(raw)) {
      setErrMsg("La etiqueta no puede tener espacios ni comas (usa letras/números/guiones).");
      setTimeout(() => setErrMsg(""), 2500);
      return;
    }
    if (etiquetas.includes(raw)) return;
    if (etiquetas.length >= 3) {
      setErrMsg("Máximo 3 etiquetas.");
      setTimeout(() => setErrMsg(""), 1800);
      return;
    }
    setEtiquetas((prev) => [...prev, raw]);
    setTagInput("");
  };
  const removeTag = (t) => setEtiquetas((prev) => prev.filter((x) => x !== t));

  /* ==== Imágenes ==== */
  const onPickFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    // límite total 5
    const remaining = Math.max(0, 5 - (imgUrls.length + filesNew.length));
    setFilesNew((prev) => [...prev, ...incoming.slice(0, remaining)]);
    e.target.value = "";
  };
  const removeExistingUrl = (idx) => {
    setImgUrls((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeNewFile = (idx) => {
    setFilesNew((prev) => prev.filter((_, i) => i !== idx));
  };

  const canAddMore = imgUrls.length + filesNew.length < 5;

  /* ==== Crear/Actualizar ==== */
  const saveProduct = async () => {
    setLoading(true);
    setOkMsg("");
    setErrMsg("");
    try {
      if (!titulo.trim()) throw new Error("Falta título.");
      if (!precio || Number(precio) <= 0) throw new Error("Precio inválido.");
      if (stock < 0) throw new Error("Stock inválido.");
      if (!IMGBB_API_KEY && filesNew.length > 0) throw new Error("Falta VITE_IMGBB_API_KEY.");

      // 1) Sube nuevas imágenes si hay
      let newUrls = [];
      for (const f of filesNew) {
        const u = await uploadToImgBB(f);
        newUrls.push(u);
      }
      const imagenesFinal = [...imgUrls, ...newUrls].slice(0, 5);

      // 2) Payload
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        descripcion_detallada: descripcionDetallada.trim() || null,
        precio: Number(precio),
        moneda: (moneda || "MXN").toUpperCase(),
        descuento: Number.isFinite(Number(descuento)) ? Number(descuento) : 0,
        etiquetas,
        imagenes: imagenesFinal,
        destacado: false,
        bajo_pedido: !!bajoPedido,
        disponible: Number(stock) > 0,
        tiempo_entrega: tiempoEntrega || null,
        stock: Math.max(0, Number(stock) || 0),
        serie: (serieSel || "").trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        // update
        const { error } = await supabase.from("productos").update(payload).eq("id", editingId);
        if (error) throw error;
        setOkMsg("Producto actualizado.");
      } else {
        // insert
        const { error } = await supabase.from("productos").insert([payload]);
        if (error) throw error;
        setOkMsg("Producto creado.");
      }

      resetForm();
      fetchList();
      fetchSeries();
    } catch (e) {
      setErrMsg(e.message || String(e));
    } finally {
      setLoading(false);
      setTimeout(() => setOkMsg(""), 3000);
    }
  };

  /* ==== UI ==== */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header bonito */}
      <div className="rounded-3xl border bg-white p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-full bg-amber-100 text-amber-700">
            <ImageIcon size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Panel de productos</h1>
            <p className="text-xs text-gray-600">Crea, edita o elimina productos.</p>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/admin")}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
          title="Volver"
        >
          <ArrowLeft size={16} /> Volver al admin
        </button>
      </div>

      {/* Mensajes */}
      <div className="mt-4 space-y-2">
        {okMsg ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 inline-flex items-center gap-2">
            <CheckCircle2 size={16} /> {okMsg}
          </div>
        ) : null}
        {errMsg ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 inline-flex items-center gap-2">
            <AlertCircle size={16} /> {errMsg}
          </div>
        ) : null}
      </div>

      {/* Formulario (bonito) */}
      <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editingId ? "Editar producto" : "Nuevo producto"}
          </h2>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-sm underline decoration-gray-300 hover:decoration-gray-700"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Título">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Raíz onírica"
            />
          </Field>

          <Field label="Serie">
            <div className="flex gap-2">
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                value={serieSel}
                onChange={(e) => setSerieSel(e.target.value)}
              >
                <option value="">— Sin serie —</option>
                {series.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                value={serieNueva}
                onChange={(e) => setSerieNueva(e.target.value)}
                placeholder="Nueva serie (ej. Serie 4)"
              />
              <button
                onClick={addSerie}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Agregar serie
              </button>
            </div>
          </Field>

          <Field label="Precio">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
              />
              <select
                className="rounded-xl border px-3 py-2 text-sm outline-none"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
              >
                <option>MXN</option>
                <option>USD</option>
              </select>
            </div>
            {precio && (
              <div className="text-xs text-gray-500 mt-1">
                Previsualización: {moneda === "MXN" ? "$" : ""}{moneyFmt(precio)}
              </div>
            )}
          </Field>

          <Field label="Descuento (%)">
            <input
              type="number"
              min="0"
              max="99"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              value={descuento}
              onChange={(e) => setDescuento(Math.max(0, Math.min(99, Number(e.target.value || 0))))}
              placeholder="0"
            />
          </Field>

          <Field label="Stock">
            <input
              type="number"
              min="0"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              value={stock}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value || 0));
                setStock(v);
              }}
            />
            <div className="text-xs text-gray-500 mt-1">
              {stock > 0 ? "Disponible" : "Sin stock"}
            </div>
          </Field>

          <Field label="Bajo pedido">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bajoPedido}
                onChange={(e) => setBajoPedido(e.target.checked)}
              />
              ¿Se fabrica a pedido?
            </label>
          </Field>

          <Field label="Tiempo de entrega">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              value={tiempoEntrega}
              onChange={(e) => setTiempoEntrega(e.target.value)}
              placeholder="Listo para envío / Hecho bajo pedido (3 semanas)"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Descripción breve">
            <textarea
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none min-h-[80px]"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Mixta sobre papel, 50x70 cm."
            />
          </Field>

          <Field label="Descripción detallada">
            <textarea
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none min-h-[80px]"
              value={descripcionDetallada}
              onChange={(e) => setDescripcionDetallada(e.target.value)}
              placeholder="Obra que explora la relación entre..."
            />
          </Field>
        </div>

        {/* Etiquetas */}
        <section className="mt-4">
          <div className="text-sm text-gray-700 font-medium mb-1">Etiquetas (máx 3)</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="ej. acrílico"
            />
            <button
              onClick={onAddTag}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Agregar
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {etiquetas.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                <Tag size={12} /> {t}
                <button
                  onClick={() => removeTag(t)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  title="Quitar"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Imágenes: un solo botón + un solo contenedor */}
        <section className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 font-medium">Imágenes (hasta 5)</div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              title="Seleccionar imágenes"
            >
              <ImageIcon size={16} /> Seleccionar imágenes
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* existentes */}
            {imgUrls.map((u, idx) => (
              <div key={`u-${idx}`} className="relative rounded-xl overflow-hidden border">
                <img src={u} alt={`img-${idx}`} className="h-32 w-full object-cover" />
                <button
                  onClick={() => removeExistingUrl(idx)}
                  className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                  title="Quitar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {/* nuevos */}
            {filesNew.map((f, idx) => {
              const url = URL.createObjectURL(f);
              return (
                <div key={`n-${idx}`} className="relative rounded-xl overflow-hidden border">
                  <img
                    src={url}
                    alt={`new-${idx}`}
                    className="h-32 w-full object-cover"
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <button
                    onClick={() => removeNewFile(idx)}
                    className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                    title="Quitar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {imgUrls.length + filesNew.length}/5 seleccionadas.
          </div>
        </section>

        {/* Acciones */}
        <div className="pt-4 flex flex-wrap gap-2">
          <button
            onClick={saveProduct}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            {editingId ? "Guardar cambios" : "Crear"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Listado de productos existentes */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Productos existentes</h3>

        {listLoading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-3">
            <Loader2 className="animate-spin" /> Cargando productos…
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">No hay productos aún.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((p) => (
              <div key={p.id} className="rounded-2xl border bg-white p-4 shadow-sm flex gap-4">
                <div className="h-24 w-24 rounded-xl overflow-hidden border bg-gray-50 shrink-0">
                  {Array.isArray(p.imagenes) && p.imagenes[0] ? (
                    <img src={p.imagenes[0]} alt={p.titulo} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-400">
                      <ImageIcon />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">{p.titulo}</div>
                    <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString("es-MX")}</div>
                  </div>
                  <div className="mt-0.5 text-sm text-gray-600">
                    {p.serie ? <span className="mr-2 italic">{p.serie}</span> : null}
                    · {p.moneda === "MXN" ? "$" : ""}{moneyFmt(p.precio)} · Stock:{" "}
                    <span className={p.stock > 0 ? "text-emerald-700" : "text-rose-700"}>{p.stock}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => loadForEdit(p.id)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                    >
                      <Pencil size={16} /> Editar
                    </button>
                    <button
                      onClick={() => confirmDelete(p.id)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 text-rose-700"
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ====== UI helpers ====== */
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-700 font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}