/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Marquee } from "@/registry/magicui/marquee"; // ⬅️ ajusta esta ruta si quedó diferente
// Si tu CLI lo dejó en "@/components/magicui/marquee", usa esa ruta.

// Supabase: usa tu cliente ya creado.
import { supabase } from "@/supabaseClient"; 
// Si en tu archivo hiciste export default, usa:  import supabase from "@/supabaseClient";

// Fallback util “cn” por si no tienes "@/lib/utils"
const cn = (...a) => a.filter(Boolean).join(" ");

// Helpers
const buildImgUrl = (p) => {
  if (!p) return "/placeholder.jpg";
  if (/^https?:\/\//i.test(p)) return p;
  if (/^\//.test(p)) return p;
  return `/${String(p).replace(/^public\//, "")}`;
};
const mapRow = (r) => ({
  id: r.id,
  titulo: r.titulo,
  descripcion: r.descripcion,
  precio: Number(r.precio),
  moneda: r.moneda || "MXN",
  destacado: !!r.destacado,
  imagen:
    (Array.isArray(r.imagenes) && r.imagenes.length && buildImgUrl(r.imagenes[0])) ||
    "/placeholder.jpg",
});

function ProductCard({ p, onClick }) {
  return (
    <figure
      onClick={onClick}
      className={cn(
        "relative h-full w-fit cursor-pointer overflow-hidden rounded-xl border p-4 sm:w-80",
        "border-gray-200 bg-white/70 hover:bg-white shadow-md"
      )}
      title={p.titulo}
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200">
        <img
          src={p.imagen}
          alt={p.titulo}
          className="w-full h-full object-cover"
          onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
        />
      </div>
      <figcaption className="mt-3 text-base font-semibold text-gray-900 line-clamp-1">
        {p.titulo}
      </figcaption>
      <p className="text-sm text-gray-700 line-clamp-2">{p.descripcion}</p>
      {Number.isFinite(p.precio) && (
        <p className="mt-2 text-[#a16207] font-semibold">${p.precio} {p.moneda}</p>
      )}
      {p.destacado && (
        <span className="absolute top-2 left-2 rounded-full bg-[#a16207] px-2 py-0.5 text-xs font-semibold text-white">
          Destacado
        </span>
      )}
    </figure>
  );
}

/**
 * MarqueeProductos
 * - Trae productos disponibles desde Supabase.
 * - Muestra dos rieles (uno en reversa) como la demo de MagicUI.
 * Props útiles:
 *   title?: string
 *   direction?: "horizontal" | "vertical" (default "horizontal")
 *   reverseSecond?: boolean (default true)
 *   limit?: number (default 12)
 */
export default function MarqueeProductos({
  title = "Previsualización de productos",
  direction = "horizontal",
  reverseSecond = true,
  limit = 12,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Carga productos
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,titulo,descripcion,precio,moneda,imagenes,destacado,disponible")
          .is("disponible", true)
          .order("id", { ascending: false })
          .limit(limit);
        if (error) throw error;
        setItems((data || []).map(mapRow));
      } catch (e) {
        console.error("Marquee productos:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  // Skeletons si no ha cargado
  const source = useMemo(
    () => (loading ? Array.from({ length: 8 }).map((_, i) => ({ id: `s${i}` })) : items),
    [loading, items]
  );
  const mid = Math.ceil(source.length / 2);
  const first = source.slice(0, mid);
  const second = source.slice(mid);

  const trackProps = {
    pauseOnHover: true,
    className: "[--duration:24s]", // > más grande = más lento
    ...(direction === "vertical" ? { vertical: true } : {}),
  };

  return (
    <section className="w-full py-14 border-t border-gray-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#a16207]">{title}</h3>
          <p className="mt-2 text-gray-700">
            Pasa el cursor para pausar. Haz clic en una tarjeta para ver más.
          </p>
        </div>

        <div
          className={cn(
            "relative flex w-full items-center justify-center overflow-hidden",
            direction === "vertical" ? "h-[500px]" : "h-auto py-2"
          )}
        >
          {/* Riel 1 */}
          <Marquee {...trackProps}>
            {first.map((p, i) =>
              loading ? (
                <div
                  key={`sk1-${i}`}
                  className="h-[260px] sm:w-80 w-[280px] mx-2 rounded-xl border border-gray-200 bg-gray-200/60 animate-pulse"
                />
              ) : (
                <ProductCard
                  key={p.id}
                  p={p}
                  onClick={() => navigate(`/producto/${p.id}`)} // ajusta si tu ruta es diferente
                />
              )
            )}
          </Marquee>

          {/* Riel 2 (reversa para efecto “tejido”) */}
          <Marquee
            {...trackProps}
            reverse={reverseSecond}
            className={cn("[--duration:24s]", direction === "vertical" ? "" : "-mt-3")}
          >
            {second.map((p, i) =>
              loading ? (
                <div
                  key={`sk2-${i}`}
                  className="h-[260px] sm:w-80 w-[280px] mx-2 rounded-xl border border-gray-200 bg-gray-200/60 animate-pulse"
                />
              ) : (
                <ProductCard
                  key={p.id}
                  p={p}
                  onClick={() => navigate(`/producto/${p.id}`)}
                />
              )
            )}
          </Marquee>

          {/* Gradientes de borde */}
          {direction === "vertical" ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#f9f4ef]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#f9f4ef]" />
            </>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#f9f4ef]" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#f9f4ef]" />
            </>
          )}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/tienda")}
            className="px-6 py-3 bg-[#a16207] text-white border border-[#a16207] rounded-full shadow-md hover:bg-[#854d06] transition"
          >
            Ver todo el catálogo
          </button>
        </div>
      </div>
    </section>
  );
}