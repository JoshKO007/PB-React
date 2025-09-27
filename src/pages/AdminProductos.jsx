// src/pages/AdminProductos.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Save, X, Images, Upload, LogIn, LogOut, Search,
  ChevronLeft, ChevronRight, Tag, Layers, CheckCircle2, AlertTriangle
} from "lucide-react";

// ========= Supabase =========
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========= Config =========
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || "M3eon1s2";
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "";

// Para preview/compat: admite http(s) o rutas locales
function buildImgUrl(pathLike) {
  if (!pathLike) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(pathLike)) return pathLike;
  if (/^\//.test(pathLike)) return pathLike;
  // por compat (si sigues guardando "public/obras/..."):
  return `/${String(pathLike).replace(/^public\//, "")}`;
}

const currencyCode = (v) => (String(v || "MXN").toUpperCase());

// ========= UI Helpers =========
const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 ${props.className||""}`}
  />
);

const Label = ({children}) => (
  <label className="text-xs font-medium text-gray-600">{children}</label>
);

const SectionCard = ({title, icon, children, right=null}) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}{title && <h3 className="font-semibold">{title}</h3>}
      </div>
      {right}
    </div>
    <div className="mt-3">{children}</div>
  </div>
);

// ========= ImgBB upload =========
async function uploadToImgBB(file) {
  if (!IMGBB_API_KEY) throw new Error("Falta VITE_IMGBB_API_KEY");
  const base64 = await fileToBase64(file);
  const form = new FormData();
  form.append("key", IMGBB_API_KEY);
  form.append("image", base64.split(",")[1]); // quitar el "data:*;base64,"
  const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error?.message || "No se pudo subir la imagen");
  // Puedes guardar display_url o url; ambas funcionan
  return json.data?.url || json.data?.display_url;
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ========= Form vacío =========
const emptyProduct = {
  id: "",                 // texto (p.e. "p9") – lo puedes dejar que lo escriba manual o lo generas
  titulo: "",
  descripcion: "",
  descripcion_det: "",
  serie: "",
  precio: "",
  moneda: "MXN",
  descuento: 0,
  etiquetas: [],          // text[]
  imagenes: [],           // text[] (URLs de ImgBB o rutas locales)
  destacado: false,
  bajo_pedido: false,
  disponible: true,
  tiempo_entreg: "",
  stock: 0,
  stripe_price_id: "",
  payment_link_: "",
};

// ========= Página principal =========
export default function AdminProductos() {
  const navigate = useNavigate();

  // “auth” súper sencilla
  const [ok, setOk] = useState(() => sessionStorage.getItem("admin_ok") === "1");
  const [pass, setPass] = useState("");

  // datos
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");

  // edición
  const [editing, setEditing] = useState(null); // objeto producto (o null)
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!ok) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setList(data || []);
      setLoading(false);
    })();
  }, [ok]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(p =>
      (p.titulo||"").toLowerCase().includes(s) ||
      (p.descripcion||"").toLowerCase().includes(s) ||
      (p.serie||"").toLowerCase().includes(s) ||
      String(p.id||"").toLowerCase().includes(s)
    );
  }, [q, list]);

  // --------- auth simple ----------
  if (!ok) {
    return (
      <div className="min-h-screen bg-[#f9f4ef] grid place-items-center px-4">
        <div className="max-w-sm w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-800">
            <LogIn size={18}/> <h1 className="font-semibold">Acceso administrador</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">Ingresa la contraseña para entrar al panel.</p>
          <div className="mt-4 space-y-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={pass}
              onChange={(e)=>setPass(e.target.value)}
              placeholder="••••••••"
            />
            <button
              onClick={()=>{
                if (pass === ADMIN_PASS) {
                  sessionStorage.setItem("admin_ok","1");
                  setOk(true);
                } else {
                  alert("Contraseña incorrecta");
                }
              }}
              className="w-full rounded-xl bg-gray-900 text-white px-3 py-2 text-sm font-semibold shadow hover:shadow-md"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------- UI listado + edición ----------
  return (
    <div className="min-h-screen bg-[#f9f4ef] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-amber-700" />
            <h1 className="text-2xl font-bold text-[#3b4d63]">Admin · Productos</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing({ ...emptyProduct })}
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
            >
              <Plus size={16}/> Nuevo producto
            </button>
            <button
              onClick={()=>{ sessionStorage.removeItem("admin_ok"); setOk(false); }}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <LogOut size={16}/> Salir
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-500"/>
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar por id, título, serie…" />
          </div>
        </div>

        {/* Lista */}
        <div className="mt-4 grid gap-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm animate-pulse h-24"/>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-gray-600">
              No hay productos.
            </div>
          ) : (
            filtered.map((p)=>(
              <div key={p.id} className="rounded-2xl border bg-white p-4 shadow-sm flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 rounded-xl border overflow-hidden bg-gray-50">
                    <img
                      src={buildImgUrl((p.imagenes?.[0]) || "")}
                      onError={(e)=>e.currentTarget.src="/placeholder.jpg"}
                      alt={p.titulo}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold">{p.titulo} <span className="text-gray-400">· {p.id}</span></div>
                    <div className="text-sm text-gray-600">{p.serie || <em className="text-gray-400">sin serie</em>}</div>
                    <div className="text-sm mt-1">
                      <span className="font-semibold">
                        {currencyCode(p.moneda) === "MXN" ? "$" : ""}{Number(p.precio||0).toFixed(2)}
                      </span>
                      {p.descuento ? <span className="ml-2 text-emerald-700 text-xs">-{p.descuento}%</span> : null}
                      {p.bajo_pedido ? <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Bajo pedido</span> : null}
                      {!p.disponible ? <span className="ml-2 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">No disponible</span> : null}
                    </div>
                    {Array.isArray(p.etiquetas) && p.etiquetas.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.etiquetas.map((t,i)=>(
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={()=>setEditing({...p})}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                  >
                    <Pencil size={14}/> Editar
                  </button>
                  <button
                    onClick={()=>setDeleting(p)}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-rose-50 text-rose-700 border-rose-200"
                  >
                    <Trash2 size={14}/> Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Edición */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[999] grid place-items-center px-4"
          >
            <motion.div
              initial={{y:30, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}}
              className="w-full max-w-3xl rounded-3xl bg-white shadow-xl border p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Images size={18} className="text-amber-700"/>
                  <h3 className="font-semibold">{editing?.id ? "Editar producto" : "Nuevo producto"}</h3>
                </div>
                <button onClick={()=>setEditing(null)} className="rounded-full border p-1 hover:bg-gray-50"><X size={16}/></button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Básicos" icon={<Tag size={16} className="text-gray-500" />}>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <Label>ID</Label>
                      <Input value={editing.id} onChange={(e)=>setEditing(s=>({...s, id:e.target.value}))} placeholder="p9 o un slug único"/>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <Label>Título</Label>
                      <Input value={editing.titulo} onChange={(e)=>setEditing(s=>({...s, titulo:e.target.value}))} />
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <Label>Serie</Label>
                      <Input value={editing.serie||""} onChange={(e)=>setEditing(s=>({...s, serie:e.target.value}))} placeholder="Ej. Serie Elementos"/>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Precio</Label>
                        <Input type="number" step="0.01" value={editing.precio||""}
                          onChange={(e)=>setEditing(s=>({...s, precio:e.target.value}))}/>
                      </div>
                      <div>
                        <Label>Moneda</Label>
                        <Input value={editing.moneda||"MXN"} onChange={(e)=>setEditing(s=>({...s, moneda:e.target.value}))}/>
                      </div>
                      <div>
                        <Label>Descuento (%)</Label>
                        <Input type="number" value={editing.descuento||0}
                          onChange={(e)=>setEditing(s=>({...s, descuento:Number(e.target.value||0)}))}/>
                      </div>
                    </div>

                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <Label>Etiquetas (coma)</Label>
                      <Input
                        value={(editing.etiquetas||[]).join(", ")}
                        onChange={(e)=>setEditing(s=>({...s, etiquetas: e.target.value.split(",").map(t=>t.trim()).filter(Boolean)}))}
                        placeholder="óleo, paisaje, azul"
                      />
                    </div>

                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <Label>Stock</Label>
                      <Input type="number" value={editing.stock||0} onChange={(e)=>setEditing(s=>({...s, stock:Number(e.target.value||0)}))}/>
                    </div>

                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <Label>Tiempo de entrega</Label>
                      <Input value={editing.tiempo_entreg||""} onChange={(e)=>setEditing(s=>({...s, tiempo_entreg:e.target.value}))} placeholder="Listo para envío / 2-3 semanas / etc."/>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-1">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!editing.destacado} onChange={(e)=>setEditing(s=>({...s, destacado:e.target.checked}))}/>
                        Destacado
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!editing.bajo_pedido} onChange={(e)=>setEditing(s=>({...s, bajo_pedido:e.target.checked}))}/>
                        Bajo pedido
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!editing.disponible} onChange={(e)=>setEditing(s=>({...s, disponible:e.target.checked}))}/>
                        Disponible
                      </label>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Descripción" icon={<Tag size={16} className="text-gray-500" />}>
                  <div className="grid gap-2">
                    <div>
                      <Label>Descripción corta</Label>
                      <textarea
                        value={editing.descripcion||""}
                        onChange={(e)=>setEditing(s=>({...s, descripcion:e.target.value}))}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 min-h-[60px]"
                      />
                    </div>
                    <div>
                      <Label>Descripción detallada</Label>
                      <textarea
                        value={editing.descripcion_det||""}
                        onChange={(e)=>setEditing(s=>({...s, descripcion_det:e.target.value}))}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 min-h-[100px]"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Imágenes (máx. 5)"
                  icon={<Images size={16} className="text-gray-500" />}
                  right={
                    <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 cursor-pointer">
                      <Upload size={14}/> Subir a ImgBB
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e)=>{
                          const files = Array.from(e.target.files||[]);
                          if (!files.length) return;
                          const remain = Math.max(0, 5 - (editing.imagenes?.length || 0));
                          const selected = files.slice(0, remain);
                          try {
                            const urls = [];
                            for (const f of selected) {
                              const u = await uploadToImgBB(f);
                              urls.push(u);
                            }
                            setEditing(s=>({...s, imagenes:[...(s.imagenes||[]), ...urls]}));
                          } catch (err) {
                            alert("Error subiendo imagen: " + (err?.message||err));
                          } finally {
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  }
                >
                  {(!editing.imagenes || editing.imagenes.length === 0) ? (
                    <div className="rounded-xl border bg-gray-50 p-4 text-center text-sm text-gray-600">
                      Aún no hay imágenes.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {editing.imagenes.map((u, idx)=>(
                        <div key={idx} className="relative group rounded-xl border overflow-hidden">
                          <img
                            src={buildImgUrl(u)}
                            onError={(e)=>e.currentTarget.src="/placeholder.jpg"}
                            alt={`img-${idx}`}
                            className="h-36 w-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={()=>{
                                // mover a la izquierda
                                if (idx === 0) return;
                                setEditing(s=>{
                                  const arr = [...(s.imagenes||[])];
                                  const [it] = arr.splice(idx,1);
                                  arr.splice(idx-1,0,it);
                                  return {...s, imagenes: arr};
                                });
                              }}
                              className="rounded-full bg-white/90 p-1 border"
                              title="Mover a la izquierda"
                            ><ChevronLeft size={14}/></button>
                            <button
                              onClick={()=>{
                                // mover a la derecha
                                setEditing(s=>{
                                  const arr = [...(s.imagenes||[])];
                                  if (idx >= arr.length-1) return s;
                                  const [it] = arr.splice(idx,1);
                                  arr.splice(idx+1,0,it);
                                  return {...s, imagenes: arr};
                                });
                              }}
                              className="rounded-full bg-white/90 p-1 border"
                              title="Mover a la derecha"
                            ><ChevronRight size={14}/></button>
                            <button
                              onClick={()=>{
                                setEditing(s=>{
                                  const arr = [...(s.imagenes||[])];
                                  arr.splice(idx,1);
                                  return {...s, imagenes: arr};
                                });
                              }}
                              className="rounded-full bg-white/90 p-1 border text-rose-600"
                              title="Quitar"
                            ><Trash2 size={14}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2">
                    Consejo: el primer elemento será la imagen principal en la tienda.
                  </p>
                </SectionCard>

                <SectionCard title="Pagos (opcional)" icon={<Tag size={16} className="text-gray-500"/>}>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <Label>Stripe price id</Label>
                      <Input value={editing.stripe_price_id||""} onChange={(e)=>setEditing(s=>({...s, stripe_price_id:e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <Label>Payment link</Label>
                      <Input value={editing.payment_link_||""} onChange={(e)=>setEditing(s=>({...s, payment_link_:e.target.value}))}/>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Botones guardar/cancelar */}
              <div className="mt-4 flex items-center justify-end gap-2">
                {editing?.id && (
                  <button
                    onClick={()=>setDeleting({...editing})}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-rose-50 text-rose-700 border-rose-200"
                  >
                    <Trash2 size={16}/> Eliminar
                  </button>
                )}
                <button
                  onClick={()=>setEditing(null)}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  onClick={async ()=>{
                    // validaciones mínimas
                    if (!editing.id?.trim()) { alert("ID es obligatorio"); return; }
                    if (!editing.titulo?.trim()) { alert("Título es obligatorio"); return; }
                    setSaving(true);
                    try {
                      const payload = {
                        ...editing,
                        moneda: currencyCode(editing.moneda || "MXN"),
                        precio: Number(editing.precio||0),
                        descuento: Number(editing.descuento||0),
                        stock: Number(editing.stock||0),
                        updated_at: new Date().toISOString(),
                      };
                      const { data, error } = await supabase
                        .from("productos")
                        .upsert(payload, { onConflict: "id" })
                        .select()
                        .single();
                      if (error) throw error;
                      // refrescar lista local
                      setList(prev=>{
                        const idx = prev.findIndex(x=>x.id===data.id);
                        if (idx === -1) return [data, ...prev];
                        const copy = [...prev]; copy[idx]=data; return copy;
                      });
                      setEditing(null);
                    } catch (e) {
                      alert("No se pudo guardar: " + (e?.message||e));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-60"
                >
                  <Save size={16}/> Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmación eliminar */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[1000] grid place-items-center px-4"
          >
            <motion.div
              initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:10, opacity:0}}
              className="w-full max-w-md rounded-2xl bg-white border shadow-xl p-5"
            >
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle size={18}/> <h3 className="font-semibold">Eliminar producto</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                ¿Seguro que deseas eliminar <strong>{deleting.titulo}</strong> ({deleting.id})? Esta acción no se puede deshacer.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={()=>setDeleting(null)} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-gray-50">Cancelar</button>
                <button
                  onClick={async ()=>{
                    try {
                      const { error } = await supabase.from("productos").delete().eq("id", deleting.id);
                      if (error) throw error;
                      setList(prev=>prev.filter(x=>x.id!==deleting.id));
                      setDeleting(null);
                      if (editing?.id === deleting.id) setEditing(null);
                    } catch (e) {
                      alert("No se pudo eliminar: " + (e?.message||e));
                    }
                  }}
                  className="rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:opacity-95"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}