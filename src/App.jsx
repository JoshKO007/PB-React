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
    <div className="min-h-screen bg-[#fdf6e3] text-gray-800 font-hand-drawn flex flex-col items-center">
      {/* Header centrado con líneas irregulares */}
      <header className="w-full max-w-4xl border-b-4 border-black py-6 px-4 relative text-center">
        <h1 className="text-4xl sm:text-5xl tracking-wide mb-2 hand-drawn-title">
          Arte de Luna
        </h1>
        <nav className="mt-4 flex flex-wrap justify-center gap-4">
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
      <main className="w-full max-w-3xl px-6 py-16 text-center">
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
      <footer className="w-full max-w-4xl text-center p-6 border-t-2 border-black">
        <p className="text-sm">&copy; 2025 Arte de Luna. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;