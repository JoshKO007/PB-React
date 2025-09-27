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
import Restauracion from "./pages/Restauración";
import Videos from "./pages/Videos";
import Tienda from "./pages/Tienda";
import Carrito from "./pages/Carrito";
import Favoritos from "./pages/Favoritos";
import PagoStripe from "./pages/PagoStripe";
import Gracias from "./pages/Gracias";
import Recibo from "./pages/Recibo";
import Rastreo from "./pages/Rastreo";
import MisPedidos from "./pages/Pedidos";
import AdminProductos from "./pages/AdminProductos";
import AdminHome from "./pages/AdminHome";


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
        <Route path="/restauracion" element={<Restauracion />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/tienda" element={<Tienda />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/pago/stripe" element={<PagoStripe />} />
        <Route path="/gracias" element={<Gracias />} />
        <Route path="/recibo" element={<Recibo />} />
        <Route path="/rastreo" element={<Rastreo />} />
        <Route path="/mis-pedidos" element={<MisPedidos />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/productos" element={<AdminProductos />} />
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
