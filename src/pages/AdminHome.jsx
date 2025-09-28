// src/pages/AdminHome.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, Package, Video } from "lucide-react";

export default function AdminHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333333]">
      <header className="w-full px-4 py-4 border-b border-gray-300 bg-[#f0eae2]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-12" />
            <div className="text-xl font-serif italic text-[#3b4d63]">
              Panel de administración
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Boxes size={22}/> Selecciona una sección
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Productos */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/admin/productos")}
            className="rounded-2xl border bg-white p-6 shadow-sm text-left hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-full bg-indigo-100 text-indigo-700">
                <Package size={18}/>
              </div>
              <div>
                <div className="font-semibold">Productos</div>
                <div className="text-sm text-gray-600">
                  Crear/editar obras, series, etiquetas, imágenes…
                </div>
              </div>
            </div>
          </motion.button>

          {/* Videos */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/admin/videos")}
            className="rounded-2xl border bg-white p-6 shadow-sm text-left hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-full bg-rose-100 text-rose-700">
                <Video size={18}/>
              </div>
              <div>
                <div className="font-semibold">Videos</div>
                <div className="text-sm text-gray-600">
                  Agregar/editar videos de YouTube con vista previa, título y descripción.
                </div>
              </div>
            </div>
          </motion.button>

          {/* Futuras secciones:
          <motion.button ...>Pedidos</motion.button>
          <motion.button ...>Contenido</motion.button>
          */}
        </div>

        <p className="mt-8 text-xs text-gray-500">
          Nota: Esta portada no está protegida con contraseña; la protección está en cada módulo.
        </p>
      </main>
    </div>
  );
}