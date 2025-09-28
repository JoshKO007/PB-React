// src/pages/AdminHome.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, Package, Video } from "lucide-react";

export default function AdminHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333]">
      {/* Header sticky */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="Logo" className="h-12 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-gray-600">Administración</div>
                <div className="text-xl font-serif italic text-[#3b4d63] truncate">
                  Panel de administración
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Boxes size={22} /> Selecciona una sección
        </h1>

        {/* Grid de secciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Productos */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/admin/productos")}
            className="group h-full rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 grid place-items-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                <Package size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-lg">Productos</div>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                  Crear/editar obras, series, etiquetas e imágenes.
                </p>
              </div>
            </div>
          </motion.button>

          {/* Videos */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/admin/videos")}
            className="group h-full rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 grid place-items-center rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Video size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-lg">Videos</div>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                  Agregar/editar videos de YouTube con vista previa, título y descripción.
                </p>
              </div>
            </div>
          </motion.button>

          {/* Ejemplo futuro (placeholder) */}
          {/* <motion.button ... /> */}
        </div>

        <p className="mt-10 text-xs text-gray-500">
          Nota: Esta portada no está protegida con contraseña; la protección está en cada módulo.
        </p>
      </main>
    </div>
  );
}