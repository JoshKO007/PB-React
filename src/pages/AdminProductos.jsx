// src/pages/AdminProductos.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Trash2,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  ArrowLeft,
  Layers,
  Star,
  RotateCcw,
  RotateCw,
  Scissors,
  X as CloseIcon,
} from "lucide-react";

/* =========================
   Config
   ========================= */
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "";
const ADMIN_PASS    = import.meta.env.VITE_ADMIN_PASSWORD || import.meta.env.VITE_ADMIN_PASS || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   Helpers
   ========================= */
const moneyFmt = (n) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

function validTag(s) {
  // sin espacios ni comas
  return /^[\p{L}\p{N}_-]+$/u.test((s || "").trim());
}

async function uploadToImgBB(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
    { method: "POST", body: fd }
  );
  const json = await res.json();
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.error?.message || "Error subiendo imagen");
  }
  return json.data.display_url || json.data.url;
}

// ⚙️ Genera el ID en el cliente (UUID v4). Si no hay crypto, hace fallback.
function genClientId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(-4);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

// dataURL -> File
async function dataURLtoFile(dataUrl, filename = "editado.png") {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

/* =========================
   Gate de acceso
   ========================= */
export default function AdminProductos() {
  const [inputPass, setInputPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem("admin:ok") === "1");
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
      <div className="min-h-[80vh] grid place-items-center bg-[#f9f4ef] px-4">
        <form
          onSubmit={tryLogin}
          className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 text-lg font-semibold text-[#3b4d63]">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-amber-100 text-amber-700">
              <LockKeyhole size={18} />
            </div>
            Acceso administrativo
          </div>

          <label className="block text-sm text-gray-600 mt-4">Contraseña</label>
          <div className="mt-1 flex items-center rounded-xl border px-3 bg-white">
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
            className="mt-4 w-full rounded-xl bg-[#3b4d63] text-white py-2 text-sm font-semibold shadow hover:shadow-md"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return <ProductosAdminUI />;
}

/* =========================
   UI principal
   ========================= */
function ProductosAdminUI() {
  const navigate = useNavigate();

  // listado
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // form state (crear/editar)
  const [editingId, setEditingId] = useState(null); // id de BD
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // series
  const [series, setSeries] = useState([]);
  const [serieSel, setSerieSel] = useState("");
  const [serieNueva, setSerieNueva] = useState("");

  // campos
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [descripcionDetallada, setDescripcionDetallada] = useState("");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState("MXN");
  const [descuento, setDescuento] = useState(0);
  const [bajoPedido, setBajoPedido] = useState(false);
  const [tiempoEntrega, setTiempoEntrega] = useState("Listo para envío");
  const [stock, setStock] = useState(1);
  const [destacado, setDestacado] = useState(false); // bandera de destacado

  // visibilidad
  const [visibleTienda, setVisibleTienda] = useState(true);
  const [visibleGaleria, setVisibleGaleria] = useState(true);

  // etiquetas
  const [tagInput, setTagInput] = useState("");
  const [etiquetas, setEtiquetas] = useState([]);

  // imágenes
  const [imgUrls, setImgUrls] = useState([]); // existentes
  const [filesNew, setFilesNew] = useState([]); // nuevas (se suben al guardar)
  const fileInputRef = useRef(null);

  /* ===== Editor de imagen (estado) ===== */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrc, setEditorSrc] = useState("");          // string (URL / objectURL)
  const [editorIsExisting, setEditorIsExisting] = useState(false); // true si viene de imgUrls
  const [editorIndex, setEditorIndex] = useState(-1);      // índice en su arreglo
  const [editorNatural, setEditorNatural] = useState({ w: 0, h: 0 });
  const [editorAngle, setEditorAngle] = useState(0);       // grados acumulados
  const [cropX, setCropX] = useState(0);                   // px sobre canvas rotado
  const [cropY, setCropY] = useState(0);
  const [cropSize, setCropSize] = useState(0);             // lado del cuadrado
  const previewCanvasRef = useRef(null);
  const hiddenImageRef = useRef(null); // para cargar y medir

  /* ===== Data ===== */
  useEffect(() => {
    fetchList();
    fetchSeries();
  }, []);

  async function fetchList() {
    setListLoading(true);
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id,titulo,precio,moneda,stock,serie,imagenes,created_at,destacado,visible_tienda,visible_galeria")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  }

  async function fetchSeries() {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("serie")
        .not("serie", "is", null);
      if (error) throw error;
      const uniq = Array.from(
        new Set((data || []).map((r) => (r.serie || "").trim()).filter(Boolean))
      );
      setSeries(uniq);
    } catch (e) {
      console.warn("No se pudieron cargar series:", e);
    }
  }

  /* ===== Reglas dependientes ===== */
  // Si stock == 0, forzar oculto en tienda
  useEffect(() => {
    if (Number(stock) === 0) {
      setVisibleTienda(false);
    }
  }, [stock]);

  /* ===== Form helpers ===== */
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
    setDestacado(false);
    setVisibleTienda(true);
    setVisibleGaleria(true);
  };

  const loadForEdit = async (id) => {
    setLoading(true);
    setOkMsg("");
    setErrMsg("");
    try {
      const { data, error } = await supabase.from("productos").select("*").eq("id", id).single();
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
      setDestacado(!!data.destacado);
      setVisibleTienda(!!data.visible_tienda);
      setVisibleGaleria(!!data.visible_galeria);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErrMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // Soft delete: ocultar de tienda y galería
  const confirmDelete = async (id) => {
    if (!confirm("¿Ocultar este producto de la tienda y galería?")) return;
    try {
      const { error } = await supabase
        .from("productos")
        .update({ visible_tienda: false, visible_galeria: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (editingId === id) resetForm();
      setOkMsg("Producto ocultado (soft-delete).");
      fetchList();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setTimeout(() => setOkMsg(""), 2200);
    }
  };

  /* ===== Series ===== */
  const addSerie = () => {
    const s = (serieNueva || "").trim();
    if (!s) return;
    if (!series.includes(s)) setSeries((prev) => [...prev, s]);
    setSerieSel(s);
    setSerieNueva("");
  };

  /* ===== Etiquetas ===== */
  const onAddTag = () => {
    const raw = (tagInput || "").trim();
    if (!raw) return;
    if (!validTag(raw)) {
      setErrMsg("La etiqueta no puede tener espacios ni comas (usa letras/números/guiones).");
      setTimeout(() => setErrMsg(""), 2200);
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

  /* ===== Imágenes ===== */
  const onPickFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;
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

  /* ===== Abrir editor para url existente o file nuevo ===== */
  const openEditorForExisting = (idx) => {
    const url = imgUrls[idx];
    if (!url) return;
    setEditorIsExisting(true);
    setEditorIndex(idx);
    setEditorSrc(url);
    setEditorAngle(0);
    setEditorOpen(true);
  };

  const openEditorForNew = (idx) => {
    const f = filesNew[idx];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setEditorIsExisting(false);
    setEditorIndex(idx);
    setEditorSrc(url);
    setEditorAngle(0);
    setEditorOpen(true);
  };

  // cargar imagen oculta para obtener dimensiones naturales y setear crop centrado
  useEffect(() => {
    if (!editorOpen || !editorSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setEditorNatural({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
      // Inicial crop cuadrado centrado sobre el canvas rotado (lo recalculamos cuando se dibuje)
      // Inicialmente usa el menor lado original
      const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
      setCropSize(Math.floor(minSide * 0.8)); // 80% del lado menor
      setCropX(0);
      setCropY(0);
      requestAnimationFrame(drawPreview);
    };
    img.src = editorSrc;
    // guardamos también en ref para draw
    hiddenImageRef.current = img;
    // cleanup objectURL si venía de file
    return () => {
      if (!editorIsExisting && editorSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(editorSrc);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen, editorSrc]);

  // redibujar preview cuando cambien parámetros
  useEffect(() => {
    if (editorOpen) drawPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorAngle, cropX, cropY, cropSize]);

  function getRotatedBounds(w, h, radians) {
    // bounding box del rectángulo w x h tras rotarlo por 'radians'
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    return {
      w: w * cos + h * sin,
      h: w * sin + h * cos,
    };
  }

  function drawPreview() {
    const img = hiddenImageRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas) return;

    const angleRad = (editorAngle * Math.PI) / 180;
    const rotBounds = getRotatedBounds(img.width, img.height, angleRad);

    // 1) canvas intermedio: dibujar imagen rotada con su bounding box
    const temp = document.createElement("canvas");
    temp.width = Math.ceil(rotBounds.w);
    temp.height = Math.ceil(rotBounds.h);
    const tctx = temp.getContext("2d");
    tctx.save();
    tctx.translate(temp.width / 2, temp.height / 2);
    tctx.rotate(angleRad);
    tctx.drawImage(img, -img.width / 2, -img.height / 2);
    tctx.restore();

    // 2) asegurar crop dentro del canvas rotado
    const maxX = Math.max(0, temp.width - cropSize);
    const maxY = Math.max(0, temp.height - cropSize);
    const sx = Math.min(Math.max(0, cropX), maxX);
    const sy = Math.min(Math.max(0, cropY), maxY);

    // 3) dibujar recorte en canvas preview (300x300)
    const PREV = 300;
    canvas.width = PREV;
    canvas.height = PREV;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PREV, PREV);
    // Fondo ajedrez suave para ver límites
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(0, 0, PREV, PREV);

    // extraer la zona recortada y escalar a 300x300
    ctx.drawImage(temp, sx, sy, cropSize, cropSize, 0, 0, PREV, PREV);

    // 4) dibujar borde
    ctx.strokeStyle = "#3b4d63";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, PREV - 2, PREV - 2);
  }

  async function applyEdit() {
    const img = hiddenImageRef.current;
    if (!img) return;

    const angleRad = (editorAngle * Math.PI) / 180;
    const rotBounds = getRotatedBounds(img.width, img.height, angleRad);

    // 1) canvas rotado completo
    const temp = document.createElement("canvas");
    temp.width = Math.ceil(rotBounds.w);
    temp.height = Math.ceil(rotBounds.h);
    const tctx = temp.getContext("2d");
    tctx.save();
    tctx.translate(temp.width / 2, temp.height / 2);
    tctx.rotate(angleRad);
    tctx.drawImage(img, -img.width / 2, -img.height / 2);
    tctx.restore();

    // clamp del recorte
    const maxX = Math.max(0, temp.width - cropSize);
    const maxY = Math.max(0, temp.height - cropSize);
    const sx = Math.min(Math.max(0, cropX), maxX);
    const sy = Math.min(Math.max(0, cropY), maxY);

    // 2) canvas final con el recorte exacto
    const out = document.createElement("canvas");
    out.width = cropSize;
    out.height = cropSize;
    const octx = out.getContext("2d");
    octx.drawImage(temp, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);

    const dataUrl = out.toDataURL("image/png", 0.95);
    const newFile = await dataURLtoFile(dataUrl, "editado.png");

    if (editorIsExisting) {
      // quitar url original y agregar archivo editado como "nuevo"
      setImgUrls((prev) => prev.filter((_, i) => i !== editorIndex));
      setFilesNew((prev) => [...prev, newFile]);
    } else {
      // reemplazar el file en filesNew
      setFilesNew((prev) => prev.map((f, i) => (i === editorIndex ? newFile : f)));
    }

    setEditorOpen(false);
    setEditorSrc("");
    setEditorIndex(-1);
  }

  function centerCropDefaults() {
    // Recalcula crop centrado usando el canvas rotado actual
    const img = hiddenImageRef.current;
    if (!img) return;
    const angleRad = (editorAngle * Math.PI) / 180;
    const rotBounds = getRotatedBounds(img.width, img.height, angleRad);
    const side = Math.floor(Math.min(rotBounds.w, rotBounds.h) * 0.8);
    const cx = Math.floor((rotBounds.w - side) / 2);
    const cy = Math.floor((rotBounds.h - side) / 2);
    setCropSize(side);
    setCropX(cx);
    setCropY(cy);
  }

  /* ===== Guardar (crear/editar) ===== */
  const saveProduct = async () => {
    setLoading(true);
    setOkMsg("");
    setErrMsg("");
    try {
      if (!titulo.trim()) throw new Error("Falta título.");
      if (!precio || Number(precio) <= 0) throw new Error("Precio inválido.");
      if (stock < 0) throw new Error("Stock inválido.");
      if (!IMGBB_API_KEY && filesNew.length > 0) {
        throw new Error("Falta VITE_IMGBB_API_KEY (Vercel env).");
      }

      // 1) Subir nuevos
      let newUrls = [];
      for (const f of filesNew) {
        const url = await uploadToImgBB(f);
        newUrls.push(url);
      }
      const imagenesFinal = [...imgUrls, ...newUrls].slice(0, 5);

      // 2) Visibilidad condicionada por stock
      let vt = !!visibleTienda;
      if (Number(stock) === 0) {
        vt = false; // regla: si stock 0, no mostrar en tienda
      }

      // 3) Payload
      const payload = {
        titulo: titulo.trim(),
        descripcion: (descripcion || "").trim() || null,
        descripcion_detallada: (descripcionDetallada || "").trim() || null,
        precio: Number(precio),
        moneda: (moneda || "MXN").toUpperCase(),
        descuento: Number.isFinite(Number(descuento)) ? Number(descuento) : 0,
        etiquetas,
        imagenes: imagenesFinal,
        destacado: !!destacado,
        bajo_pedido: !!bajoPedido,
        disponible: Number(stock) > 0,
        tiempo_entrega: tiempoEntrega || null,
        stock: Math.max(0, Number(stock) || 0),
        serie: (serieSel || "").trim() || null,
        visible_tienda: vt,
        visible_galeria: !!visibleGaleria,
        updated_at: new Date().toISOString(),
      };

      // 4) Crear/actualizar
      if (editingId) {
        const { error } = await supabase.from("productos").update(payload).eq("id", editingId);
        if (error) throw error;
        setOkMsg("Producto actualizado.");
      } else {
        const newId = genClientId(); // ID generado en el cliente
        const { error } = await supabase.from("productos").insert([{ id: newId, ...payload }]);
        if (error) throw error;
        setOkMsg(`Producto creado (ID: ${newId.slice(0, 8)}…)`);
      }

      resetForm();
      fetchList();
      fetchSeries();
    } catch (e) {
      setErrMsg(e.message || String(e));
    } finally {
      setLoading(false);
      setTimeout(() => setOkMsg(""), 2800);
    }
  };

  /* =========================
     UI (side-by-side)
     ========================= */
  return (
    <div className="min-h-screen bg-[#f9f4ef]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0eae2]/80 backdrop-blur-md border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-amber-100 text-amber-700 shadow">
              <Layers size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#3b4d63]">Admin · Productos</div>
              <div className="text-xs text-gray-600">Crea y gestiona tu catálogo</div>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white/80 hover:bg-white shadow-sm"
            title="Volver al admin"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      </div>

      {/* mensajes */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="space-y-2">
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
      </div>

      {/* Layout: form izquierda, listado derecha */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====== Formulario ====== */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#3b4d63]">
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

          {/* Campos */}
          <div className="mt-5 grid grid-cols-1 gap-4">
            <Field label="Título">
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Raíz onírica"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Serie">
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  value={serieSel}
                  onChange={(e) => setSerieSel(e.target.value)}
                >
                  <option value="">— Sin serie —</option>
                  {series.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
                    Agregar
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
                    Previsualización: {moneda === "MXN" ? "$" : ""}
                    {moneyFmt(precio)}
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
                  onChange={(e) =>
                    setDescuento(Math.max(0, Math.min(99, Number(e.target.value || 0))))
                  }
                  placeholder="0"
                />
              </Field>

              <Field label="Stock">
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Number(e.target.value || 0)))}
                />
                <div className="text-xs mt-1">
                  {stock > 0 ? (
                    <span className="text-emerald-700">Disponible</span>
                  ) : (
                    <span className="text-rose-700">Sin stock (oculto en Tienda)</span>
                  )}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Destacado */}
            <Field label="Destacada">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                />
                Mostrar como destacada en la tienda
              </label>
            </Field>

            {/* Visibilidad por canal */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Visibilidad (Tienda)">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleTienda}
                    onChange={(e) => setVisibleTienda(e.target.checked)}
                    disabled={Number(stock) === 0}
                    title={Number(stock) === 0 ? "Con stock 0, Tienda se oculta" : "Mostrar en Tienda"}
                  />
                  {Number(stock) === 0 ? "Oculta por stock 0" : "Mostrar en Tienda"}
                </label>
              </Field>

              <Field label="Visibilidad (Galería)">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleGaleria}
                    onChange={(e) => setVisibleGaleria(e.target.checked)}
                  />
                  Mostrar en Galería
                </label>
              </Field>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Agregar
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {etiquetas.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f0eae2] px-3 py-1 text-xs font-medium text-[#3b4d63] ring-1 ring-[#3b4d63]/10"
                  >
                    <Tag size={12} /> {t}
                    <button
                      onClick={() => removeTag(t)}
                      className="ml-1 text-[#3b4d63]/70 hover:text-[#3b4d63]"
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
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 font-medium">Imágenes (hasta 5)</div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
                  title="Seleccionar imágenes"
                >
                  <ImageIcon size={16} /> Añadir
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
                  <div key={`u-${idx}`} className="relative rounded-2xl overflow-hidden border">
                    <img src={u} alt={`img-${idx}`} className="h-32 w-full object-cover" />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        onClick={() => openEditorForExisting(idx)}
                        className="rounded-full bg-white/90 p-1 shadow hover:bg-white"
                        title="Editar imagen"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeExistingUrl(idx)}
                        className="rounded-full bg-white/90 p-1 shadow hover:bg-white"
                        title="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* nuevos */}
                {filesNew.map((f, idx) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <div key={`n-${idx}`} className="relative rounded-2xl overflow-hidden border">
                      <img
                        src={url}
                        alt={`new-${idx}`}
                        className="h-32 w-full object-cover"
                        onLoad={() => URL.revokeObjectURL(url)}
                      />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          onClick={() => openEditorForNew(idx)}
                          className="rounded-full bg-white/90 p-1 shadow hover:bg-white"
                          title="Editar imagen"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeNewFile(idx)}
                          className="rounded-full bg-white/90 p-1 shadow hover:bg-white"
                          title="Quitar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* slot para drag/drop o añadir más */}
                {canAddMore && (
                  <label
                    htmlFor="hidden-file-trigger"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border border-dashed grid place-items-center h-32 text-gray-500 hover:bg-gray-50"
                    title="Haz clic para añadir o arrastra aquí"
                  >
                    <div className="flex flex-col items-center text-sm">
                      <Plus />
                      <span className="mt-1">Agregar/arrastrar</span>
                    </div>
                  </label>
                )}
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {imgUrls.length + filesNew.length}/5 seleccionadas.
              </div>
            </section>

            {/* Acciones */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={saveProduct}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-[#3b4d63] text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                {editingId ? "Guardar cambios" : "Crear producto"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50"
                title="Borrar formulario"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* ====== Listado (al lado) ====== */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[#3b4d63]">Productos existentes</h3>
          </div>

          {listLoading ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-3">
              <Loader2 className="animate-spin" /> Cargando productos…
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">No hay productos aún.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {list.map((p) => {
                const oculto = !p.visible_tienda && !p.visible_galeria;
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition flex gap-4 ${oculto ? "opacity-70" : ""}`}
                  >
                    <div className="h-24 w-24 rounded-xl overflow-hidden border bg-gray-50 shrink-0 relative">
                      {p.destacado && (
                        <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-[2px] text-[10px] font-semibold">
                          <Star size={12} /> Destacado
                        </span>
                      )}
                      {Array.isArray(p.imagenes) && p.imagenes[0] ? (
                        <img
                          src={p.imagenes[0]}
                          alt={p.titulo}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-gray-400">
                          <ImageIcon />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold truncate text-[#3b4d63]">{p.titulo}</div>
                        <div className="text-xs text-gray-500">
                          {new Intl.DateTimeFormat("es-MX").format(new Date(p.created_at))}
                        </div>
                      </div>

                      <div className="mt-0.5 text-sm text-gray-600">
                        {p.serie ? <span className="mr-2 italic">{p.serie}</span> : null}
                        · {p.moneda === "MXN" ? "$" : ""}
                        {moneyFmt(p.precio)} · Stock:{" "}
                        <span className={p.stock > 0 ? "text-emerald-700" : "text-rose-700"}>
                          {p.stock}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        {p.visible_tienda && (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-[2px] ring-1 ring-emerald-200">
                            Tienda
                          </span>
                        )}
                        {p.visible_galeria && (
                          <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-[2px] ring-1 ring-indigo-200">
                            Galería
                          </span>
                        )}
                        {oculto && (
                          <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-[2px] ring-1 ring-gray-200">
                            Oculto
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => loadForEdit(p.id)}
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
                        >
                          <Pencil size={16} /> Editar
                        </button>
                        <button
                          onClick={() => confirmDelete(p.id)}
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50 text-rose-700"
                          title="Ocultar de Tienda y Galería (soft-delete)"
                        >
                          <Trash2 size={16} /> Ocultar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Modal editor de imagen ===== */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl border overflow-hidden">
            {/* Header modal */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#3b4d63] font-semibold">
                <Scissors size={18} />
                Editor de imagen
              </div>
              <button
                onClick={() => setEditorOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
                title="Cerrar"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preview */}
              <div className="rounded-2xl border grid place-items-center p-3 bg-gray-50">
                <canvas ref={previewCanvasRef} className="max-w-full rounded-xl" />
                {/* imagen oculta para mediciones */}
                <img
                  src={editorSrc}
                  alt="hidden"
                  className="hidden"
                  ref={hiddenImageRef}
                />
              </div>

              {/* Controles */}
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Rotación</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditorAngle((a) => a - 45)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
                    >
                      <RotateCcw size={16} /> -45°
                    </button>
                    <button
                      onClick={() => setEditorAngle((a) => a + 45)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
                    >
                      <RotateCw size={16} /> +45°
                    </button>
                    <button
                      onClick={() => setEditorAngle(0)}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
                      title="Restablecer"
                    >
                      0°
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Recorte (cuadrado)</div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10">X</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, Math.ceil(getRotatedBounds(editorNatural.w, editorNatural.h, (editorAngle*Math.PI)/180).w) - cropSize)}
                      value={cropX}
                      onChange={(e) => setCropX(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">{cropX}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10">Y</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, Math.ceil(getRotatedBounds(editorNatural.w, editorNatural.h, (editorAngle*Math.PI)/180).h) - cropSize)}
                      value={cropY}
                      onChange={(e) => setCropY(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">{cropY}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10">Tamaño</span>
                    <input
                      type="range"
                      min={50}
                      max={Math.floor(Math.min(
                        Math.ceil(getRotatedBounds(editorNatural.w, editorNatural.h, (editorAngle*Math.PI)/180).w),
                        Math.ceil(getRotatedBounds(editorNatural.w, editorNatural.h, (editorAngle*Math.PI)/180).h)
                      ))}
                      value={cropSize}
                      onChange={(e) => setCropSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">{cropSize}px</span>
                  </div>

                  <div>
                    <button
                      onClick={centerCropDefaults}
                      className="mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
                    >
                      Centrar recorte
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer acciones */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Tip: puedes aplicar varias rotaciones de 45° y ajustar el cuadro con los controles.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditorOpen(false)}
                  className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyEdit}
                  className="rounded-full bg-[#3b4d63] text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
                >
                  Aplicar y reemplazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Campo
   ========================= */
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-700 font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}