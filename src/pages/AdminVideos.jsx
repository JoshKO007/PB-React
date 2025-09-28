// src/pages/AdminVideos.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film, Youtube, Eye, EyeOff, Save, Trash2, LogOut, Search,
  CornerUpLeft, Loader2, Link as LinkIcon, BadgeCheck, PencilLine
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

/* =========================
   Config y Supabase
   ========================= */
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PASS    = import.meta.env.VITE_ADMIN_PASSWORD || "";
const supabase      = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   Helpers YouTube
   ========================= */
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return "";
  const v = String(urlOrId).trim();
  if (/^[\w-]{11}$/.test(v)) return v;                   // ID
  let m = v.match(/youtu\.be\/([\w-]{11})/i);            // youtu.be/<id>
  if (m) return m[1];
  m = v.match(/[?&]v=([\w-]{11})/i);                     // watch?v=<id>
  if (m) return m[1];
  m = v.match(/\/embed\/([\w-]{11})/i);                  // /embed/<id>
  if (m) return m[1];
  m = v.match(/\/shorts\/([\w-]{11})/i);                 // /shorts/<id>
  if (m) return m[1];
  return "";
}
const embedUrl = (id) => (id ? `https://www.youtube.com/embed/${id}` : "");
const thumbUrl = (id) => (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "/placeholder.jpg");

/* =========================
   Component
   ========================= */
export default function AdminVideos() {
  const navigate = useNavigate();

  // Gate simple de admin
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");

  // UI estado
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edición/creación
  const [form, setForm] = useState({
    id: null,           // uuid
    url: "",
    video_id: "",
    titulo: "",
    descripcion: "",
    publicado: true,
  });

  // Lista
  const [videos, setVideos] = useState([]);
  const [q, setQ] = useState("");

  // Prefs UI
  const [showPreview, setShowPreview] = useState(true);

  // Cargar lista
  useEffect(() => {
    if (!authed) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("videos")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setVideos(data || []);
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [authed]);

  // Derivar video_id al pegar URL
  useEffect(() => {
    const id = extractYouTubeId(form.url || form.video_id);
    if (id && id !== form.video_id) {
      setForm((f) => ({ ...f, video_id: id }));
    }
  }, [form.url]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return videos;
    return videos.filter((v) =>
      (v.titulo || "").toLowerCase().includes(term) ||
      (v.descripcion || "").toLowerCase().includes(term) ||
      (v.url || "").toLowerCase().includes(term)
    );
  }, [q, videos]);

  const resetForm = () => {
    setForm({
      id: null,
      url: "",
      video_id: "",
      titulo: "",
      descripcion: "",
      publicado: true,
    });
  };

  const onEdit = (row) => {
    setForm({
      id: row.id,
      url: row.url || (row.video_id ? `https://youtu.be/${row.video_id}` : ""),
      video_id: row.video_id || "",
      titulo: row.titulo || "",
      descripcion: row.descripcion || "",
      publicado: !!row.publicado,
    });
    // El editor es sticky, no hace falta scrollTo
  };

  const onDelete = async (row) => {
    if (!confirm(`¿Eliminar el video “${row.titulo || row.video_id}”?`)) return;
    try {
      setDeleting(row.id);
      const { error } = await supabase.from("videos").delete().eq("id", row.id);
      if (error) throw error;
      setVideos((prev) => prev.filter((x) => x.id !== row.id));
      if (form.id === row.id) resetForm();
    } catch (e) {
      alert(`No se pudo eliminar: ${e.message || e}`);
    } finally {
      setDeleting("");
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");

      const id = extractYouTubeId(form.video_id || form.url);
      if (!id) throw new Error("Pega un enlace válido de YouTube.");

      const payload = {
        url: form.url || `https://youtu.be/${id}`,
        video_id: id,
        titulo: (form.titulo || "").trim() || null,
        descripcion: (form.descripcion || "").trim() || null,
        publicado: !!form.publicado,
      };

      if (form.id) {
        const { data, error } = await supabase
          .from("videos")
          .update(payload)
          .eq("id", form.id)
          .select()
          .single();
        if (error) throw error;
        setVideos((prev) => prev.map((x) => (x.id === form.id ? data : x)));
      } else {
        const { data, error } = await supabase
          .from("videos")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setVideos((prev) => [data, ...prev]);
      }

      resetForm();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  /* ========== Login simple ========== */
  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f9f4ef] px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Film className="text-[#a16207]" />
            <h1 className="text-lg font-semibold">Admin · Videos</h1>
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
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold hover:bg-[#854d06]"
          >
            Entrar <BadgeCheck size={16} />
          </button>

          <button
            onClick={() => navigate("/admin")}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <CornerUpLeft size={16} /> Volver al panel
          </button>
        </div>
      </div>
    );
  }

  /* ========== UI principal ========== */
  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0eae2]/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 grid place-items-center rounded-full bg-white border shrink-0">
              <Youtube className="text-[#a16207]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Administración</div>
              <div className="font-semibold truncate">Videos (YouTube)</div>
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

      {/* Layout responsive */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-[1.05fr_1.15fr] gap-8">
        {/* Col izquierda: Editor (sticky) */}
        <div className="min-w-0 lg:sticky lg:top-20 self-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-white shadow-sm p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Film className="text-[#a16207]" />
                <h2 className="text-lg font-semibold">
                  {form.id ? "Editar video" : "Agregar video"}
                </h2>
              </div>

              <button
                onClick={() => setShowPreview((v) => !v)}
                className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                title={showPreview ? "Ocultar previsualización" : "Mostrar previsualización"}
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />} Preview
              </button>
            </div>

            {/* Errores */}
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

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1">
                  <LinkIcon size={14} /> Enlace de YouTube o ID
                </label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://youtu.be/XXXXXXXXXXX o ID"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                />
                {!!form.video_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    ID detectado: <span className="font-mono">{form.video_id}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Título</label>
                  <input
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Título del video"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Publicado</label>
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.publicado}
                        onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked }))}
                      />
                      Visible en la web
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={5}
                  placeholder="Descripción breve del video…"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Preview */}
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 rounded-2xl border overflow-hidden bg-black/5"
                >
                  {form.video_id ? (
                    <div className="aspect-video w-full">
                      <iframe
                        src={embedUrl(form.video_id)}
                        title="Vista previa"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full grid place-items-center text-sm text-gray-500">
                      Pega un enlace para previsualizar…
                    </div>
                  )}
                </motion.div>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#a16207] text-white px-4 py-2 text-sm font-semibold hover:bg-[#854d06] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {form.id ? "Guardar cambios" : "Crear video"}
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

        {/* Col derecha: listado (scroll propio para evitar cortes) */}
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-white shadow-sm p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Youtube className="text-[#a16207]" />
                <h2 className="text-lg font-semibold">Videos guardados</h2>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por título o descripción…"
                  className="pl-7 w-full rounded-full border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="animate-spin" size={16} /> Cargando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-6 text-sm text-gray-600">No hay videos.</div>
            ) : (
              <div className="mt-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {filtered.map((v) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border overflow-hidden bg-white shadow-sm flex flex-col h-full"
                    >
                      <div className="aspect-video bg-black/5 overflow-hidden">
                        {v.video_id ? (
                          <img
                            src={thumbUrl(v.video_id)}
                            alt={v.titulo || v.video_id}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xs text-gray-500">
                            Sin preview
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col min-h-0">
                        <div className="text-sm text-gray-500">YouTube</div>
                        <div className="font-semibold line-clamp-2">{v.titulo || v.video_id}</div>
                        {v.descripcion && (
                          <div className="mt-1 text-sm text-gray-700 line-clamp-3">
                            {v.descripcion}
                          </div>
                        )}
                        <div className="mt-auto pt-3 flex items-center justify-between">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              v.publicado
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {v.publicado ? "Publicado" : "Oculto"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onEdit(v)}
                              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50"
                              title="Editar"
                            >
                              <PencilLine size={14} /> Editar
                            </button>
                            <button
                              onClick={() => onDelete(v)}
                              disabled={deleting === v.id}
                              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 text-rose-600 disabled:opacity-50"
                              title="Eliminar"
                            >
                              {deleting === v.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}