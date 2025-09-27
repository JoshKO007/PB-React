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
  // Sin espacios ni comas. Permitimos letras con acentos, números, guión y guión bajo.
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
  // Puedes usar display_url, url o image.url. La pública suele ser display_url:
  return json.data.display_url || json.data.url;
}

/* ====== Component ====== */
export default function AdminProductos() {
  const navigate = useNavigate();

  // Gate muy simple por contraseña
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

  return <ProductosForm />;
}

/* ====== Productos Form ====== */
function ProductosForm() {
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg]     = useState("");
  const [errMsg, setErrMsg]   = useState("");

  // Series (lista seleccionable + crear nuevas)
  const [series, setSeries]           = useState([]); // ["Serie 1", "Serie 2", ...]
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

  // Imágenes: guardamos File[] local y previews. Se suben a ImgBB al crear.
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // Trae series existentes (distinct)
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
    })();
  }, []);

  const addSerie = () => {
    const s = (serieNueva || "").trim();
    if (!s) return;
    if (!series.includes(s)) setSeries((prev) => [...prev, s]);
    setSerieSel(s);
    setSerieNueva("");
  };

  // Etiquetas
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

  // Imágenes
  const onPickFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const maxSlots = Math.max(0, 5 - prev.length);
      return [...prev, ...incoming.slice(0, maxSlots)];
    });
    // Re-armar el input para poder volver a cargar el mismo archivo si quiere
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files || []);
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const maxSlots = Math.max(0, 5 - prev.length);
      return [...prev, ...incoming.slice(0, maxSlots)];
    });
  };

  const removeFileAt = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearImages = () => setFiles([]);

  const totalImgs = files.length;
  const canAddMore = totalImgs < 5;

  // Submit
  const onCreate = async () => {
    setLoading(true);
    setOkMsg("");
    setErrMsg("");

    try {
      if (!titulo.trim()) throw new Error("Falta título.");
      if (!precio || Number(precio) <= 0) throw new Error("Precio inválido.");
      if (stock < 0) throw new Error("Stock inválido.");
      if (!IMGBB_API_KEY) throw new Error("Falta VITE_IMGBB_API_KEY.");

      // 1) Sube imágenes a ImgBB
      let urls = [];
      for (const f of files) {
        const u = await uploadToImgBB(f);
        urls.push(u);
      }

      // 2) Construye payload con nombres de columnas reales
      const payload = {
        // id: (lo generará tu proceso/server si aplica; aquí no mandamos id)
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        descripcion_detallada: descripcionDetallada.trim() || null,
        precio: Number(precio),
        moneda: (moneda || "MXN").toUpperCase(),
        descuento: Number.isFinite(Number(descuento)) ? Number(descuento) : 0,
        etiquetas: etiquetas,              // text[]
        imagenes: urls,                    // text[] (urls imgbb)
        destacado: false,                  // lo puedes editar más tarde
        bajo_pedido: !!bajoPedido,
        // disponible se calcula por stock, pero la columna existe: lo mandamos para mantener consistencia
        disponible: Number(stock) > 0,
        tiempo_entrega: tiempoEntrega || null,
        stock: Math.max(0, Number(stock) || 0),
        serie: (serieSel || "").trim() || null,
        // stripe_price_id y payment_link_url no se usan (UI removido)
      };

      // 3) Inserta
      const { data, error } = await supabase.from("productos").insert([payload]).select().single();
      if (error) throw error;

      setOkMsg(`Producto creado (${data?.id || "sin id visible"})`);
      // Limpia form
      setTitulo("");
      setDescripcion("");
      setDescripcionDetallada("");
      setPrecio("");
      setDescuento(0);
      setEtiquetas([]);
      setFiles([]);
      setBajoPedido(false);
      setTiempoEntrega("Listo para envío");
      setStock(1);
      // mantener serieSel/moneda como están
    } catch (e) {
      setErrMsg(e.message || String(e));
    } finally {
      setLoading(false);
      setTimeout(() => setOkMsg(""), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Administrador — Productos</h1>
        <p className="text-sm text-gray-600">Crea productos y sube hasta 5 imágenes (ImgBB) al guardar.</p>
      </div>

      {/* Mensajes */}
      <AnimatePresenceMsg ok={okMsg} err={errMsg} />

      <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-6">
        {/* Básicos */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </section>

        {/* Descripciones */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </section>

        {/* Etiquetas */}
        <section>
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

        {/* Imágenes */}
        <section>
          <div className="text-sm text-gray-700 font-medium mb-1">Imágenes (hasta 5)</div>

          <div
            className="rounded-2xl border border-dashed p-4 text-center text-sm text-gray-600 bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            Arrastra y suelta aquí o usa “+ Agregar imágenes”.
          </div>

          {/* Grid de previews */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {files.map((f, idx) => {
              const url = URL.createObjectURL(f);
              return (
                <div key={idx} className="relative rounded-xl overflow-hidden border">
                  <img
                    src={url}
                    alt={`img-${idx}`}
                    className="h-32 w-full object-cover"
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <button
                    onClick={() => removeFileAt(idx)}
                    className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                    title="Quitar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* Botón + siempre visible mientras haya espacio */}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-32 w-full rounded-xl border border-dashed flex flex-col items-center justify-center text-sm hover:bg-gray-50"
                title="Agregar imágenes"
              >
                <Plus />
                Agregar imágenes
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              + Agregar imágenes
            </button>
            {files.length > 0 && (
              <button
                onClick={clearImages}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                title="Borrar imágenes seleccionadas"
              >
                <Trash2 size={16} /> Borrar imágenes
              </button>
            )}
          </div>
        </section>

        {/* Acciones */}
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            onClick={onCreate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Crear
          </button>
        </div>
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

function AnimatePresenceMsg({ ok, err }) {
  return (
    <div className="space-y-2">
      {ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 inline-flex items-center gap-2">
          <CheckCircle2 size={16} /> {ok}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 inline-flex items-center gap-2">
          <AlertCircle size={16} /> {err}
        </div>
      ) : null}
    </div>
  );
}