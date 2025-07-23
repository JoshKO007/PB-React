// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import InicioSesion from "./pages/inicioSesion";
import Registro from "./pages/Registro"; 
import "./index.css";
import Contacto from "./pages/Contacto"; 
import Recuerdo from "./pages/Recuerdo";
import Galeria from "./pages/Galeria"; 
import Artista from "./pages/Artista";
import Usuario from "./pages/Usuario";
import Direccion from "./pages/Direccion";
import Contraseña from "./pages/Contraseña";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/iniciar-sesion" element={<InicioSesion />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuerdo" element={<Recuerdo />} />
        <Route path="/galeria" element={<Galeria />} />
        <Route path="/artista" element={<Artista />} />
        <Route path="/contacto" element={<Contacto />} />
       <Route path="/usuario" element={<Usuario />} />
        <Route path="/direccion" element={<Direccion />} />
        <Route path="/contrasena" element={<Contraseña />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
