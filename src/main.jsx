// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import InicioSesion from "./pages/inicioSesion";
import Registro from "./pages/Registro"; 
import "./index.css";
import Recuerdo from "./pages/Recuerdo";
import Galeria from "./pages/Galeria"; 

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/iniciar-sesion" element={<InicioSesion />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuerdo" element={<Recuerdo />} />
        <Route path="/galeria" element={<Galeria />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

const obras = [
  {
    titulo: 'Fragmentos de silencio',
    descripcion: 'Acrílico sobre lienzo. Serie introspectiva que explora la memoria emocional.',
    imagen: '/obras/obra1.jpg',
  },
  {
    titulo: 'Ecos de lo invisible',
    descripcion: 'Técnica mixta. Una obra que sugiere el movimiento del pensamiento.',
    imagen: '/obras/obra2.jpeg',
  },
  {
    titulo: 'Sombras del alba',
    descripcion: 'Carboncillo sobre papel. Fragmentos de la frontera entre sueño y vigilia.',
    imagen: '/obras/obra3.jpg',
  },
];