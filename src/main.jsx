import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Importación normal de componentes que NO fallan
import App from "./App";
import InicioSesion from "./pages/inicioSesion";
import Registro from "./pages/Registro";
import Contacto from "./pages/Contacto";
import Recuerdo from "./pages/Recuerdo";
import Galeria from "./pages/Galeria";
import Artista from "./pages/Artista";

// ⚠️ Importación diferida del componente problemático
const ConfiguracionUsuario = React.lazy(() => import("./pages/Configuracion"));

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="p-8 text-center text-[#a16207]">Cargando configuración...</div>}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/iniciar-sesion" element={<InicioSesion />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuerdo" element={<Recuerdo />} />
          <Route path="/galeria" element={<Galeria />} />
          <Route path="/artista" element={<Artista />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/configuracion" element={<ConfiguracionUsuario />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
