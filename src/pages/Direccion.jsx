import React, { useEffect, useState } from 'react';
import countries from 'world-countries';
import estadosJSON from '../data/estadosPorPais.json';

export default function FormularioDireccion() {
  const [paises, setPaises] = useState([]);
  const [estados, setEstados] = useState([]);
  const [form, setForm] = useState({
    pais: '',
    estado: ''
  });

  useEffect(() => {
    const lista = countries
      .map(p => ({ nombre: p.name.common, codigo: p.cca2 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    setPaises(lista);
  }, []);

  useEffect(() => {
    if (form.pais) {
      const estadosFiltrados = estadosJSON
        .filter(e => e.country_code === form.pais)
        .map(e => e.name);
      setEstados(estadosFiltrados);
    } else {
      setEstados([]);
    }
  }, [form.pais]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Dirección</h2>

      {/* País */}
      <select name="pais" value={form.pais} onChange={handleChange} className="w-full border p-2 rounded mb-4">
        <option value="">Selecciona un país</option>
        {paises.map(p => (
          <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
        ))}
      </select>

      {/* Estado */}
      {estados.length > 0 && (
        <select name="estado" value={form.estado} onChange={handleChange} className="w-full border p-2 rounded mb-4">
          <option value="">Selecciona un estado</option>
          {estados.map((e, i) => (
            <option key={i} value={e}>{e}</option>
          ))}
        </select>
      )}
    </div>
  );
}
