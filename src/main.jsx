// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import InicioSesion from "./pages/inicioSesion";
import Registro from "./pages/Registro"; 
import "./index.css";
import Recuerdo from "./pages/Recuerdo";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/iniciar-sesion" element={<InicioSesion />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuerdo" element={<Recuerdo />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
