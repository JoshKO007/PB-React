// src/App.jsx
import { useState } from 'react';

function App() {
  const [hovered, setHovered] = useState(null);

  const menu = [
    "Inicio",
    "Galería",
    "Tienda",
    "Sobre la artista",
    "Prensa",
    "Contacto"
  ];

  return (
    <div className="min-h-screen bg-[#fefcfb] text-gray-800 font-hand-drawn">
      {/* Header con líneas irregulares */}
      <header className="border-b-4 border-black p-6 relative">
        <h1 className="text-4xl sm:text-5xl tracking-wide mb-2 hand-drawn-title">
          Arte de Luna
        </h1>
        <nav className="mt-4 flex gap-4 flex-wrap">
          {menu.map((item, index) => (
            <span
              key={index}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className={`cursor-pointer px-2 py-1 relative transition-transform duration-200
                ${hovered === index ? 'scale-110 underline' : ''}`}
            >
              {item}
            </span>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 h-2 bg-[url('/sketch-line.svg')] bg-repeat-x"></div>
      </header>

      {/* Hero principal */}
      <main className="px-6 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
          Bienvenid@ al universo visual de Luna
        </h2>
        <p className="max-w-xl mx-auto text-lg">
          Sumérgete en una galería donde cada trazo cuenta una historia. Todas las obras están hechas a mano, con alma, y ahora puedes llevarlas contigo.
        </p>
        <button className="mt-10 px-6 py-3 bg-black text-white rounded-full shadow-md hover:shadow-lg transition-all">
          Ver colección destacada
        </button>
      </main>

      {/* Pie de página simple */}
      <footer className="text-center p-6 border-t-2 border-black">
        <p className="text-sm">&copy; 2025 Arte de Luna. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
