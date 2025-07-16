import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, ArrowLeft, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { createClient } from '@supabase/supabase-js';
import sha256 from 'crypto-js/sha256';

const supabase = createClient(
  'https://ousgktyljynqzrnafoqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2drdHlsanlucXpybmFmb3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDMxNjYsImV4cCI6MjA2ODE3OTE2Nn0.hG27iuA-iNH3e3PPRck7ELgO89aRTbMiM8I65085TcE'
);

export default function Recuerdo() {
  const [email, setEmail] = useState('');
  const [paso, setPaso] = useState(1);
  const [codigo, setCodigo] = useState(Array(8).fill(''));
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();

  const generarCodigo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  };

  const validarCorreo = (correo) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  const enviarCorreo = async (correo, codigo) => {
    try {
      await emailjs.send(
        'service_558lyos',
        'template_7kf4bpa',
        {
          email: correo,
          codigo: `${codigo.slice(0, 4)}-${codigo.slice(4)}`
        },
        'IocrxeuloEX0NF9le'
      );
      return true;
    } catch (err) {
      console.error('Error al enviar el correo:', err);
      return false;
    }
  };

  const handleCorreoSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!validarCorreo(email)) return setError('Correo no válido.');

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (!usuario) return setError('Este correo no está registrado.');

    const codigoGenerado = generarCodigo();
    const expiracion = new Date(Date.now() + 10 * 60000); // 10 minutos

    await supabase.from('codigos_recuperacion').insert({
      email,
      codigo: codigoGenerado,
      expires_at: expiracion.toISOString()
    });

    const enviado = await enviarCorreo(email, codigoGenerado);
    if (enviado) {
      setPaso(2);
      setMensaje('Código enviado a tu correo.');
    } else {
      setError('No se pudo enviar el correo.');
    }
  };

  const handleInputChange = (i, val) => {
    if (!/^[a-zA-Z0-9]?$/.test(val)) return;
    const nuevo = [...codigo];
    nuevo[i] = val.toUpperCase();
    setCodigo(nuevo);
    if (val && i < 7) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !codigo[i] && i > 0)
      inputRefs.current[i - 1]?.focus();
  };

  const verificarCodigo = async () => {
    const code = codigo.join('');
    const { data } = await supabase
      .from('codigos_recuperacion')
      .select('*')
      .eq('email', email)
      .eq('codigo', code)
      .gt('expires_at', new Date().toISOString());

    if (data && data.length > 0) {
      setPaso(3);
      setMensaje('');
    } else {
      setError('Código inválido o expirado.');
    }
  };

  const actualizarPassword = async () => {
    setError('');
    setMensaje('');

    if (password.length < 6) return setError('Contraseña muy corta.');
    if (password !== confirmar) return setError('No coinciden.');

    const hashed = sha256(password).toString(); // 💥 igual que en InicioSesion

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ password: hashed })
      .eq('email', email);

    if (updateError) {
      setError('Error al actualizar la contraseña.');
    } else {
      await supabase
        .from('codigos_recuperacion')
        .delete()
        .eq('email', email);

      setMensaje('✅ Contraseña actualizada. Redirigiendo...');
      setTimeout(() => navigate('/iniciar-sesion'), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f4ef] text-[#333] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-xl shadow-xl w-full max-w-md"
      >
        <div className="text-center mb-6">
          <Mail size={40} className="mx-auto text-[#a16207]" />
          <h2 className="text-3xl font-bold mt-4">Recuperar contraseña</h2>
          <p className="text-sm text-gray-600">
            {paso === 1 && 'Ingresa tu correo.'}
            {paso === 2 && 'Introduce el código recibido.'}
            {paso === 3 && 'Establece una nueva contraseña.'}
          </p>
        </div>

        {/* Paso 1 */}
        {paso === 1 && (
          <form onSubmit={handleCorreoSubmit} className="space-y-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full border px-4 py-2 rounded-md"
              required
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              className="w-full bg-[#a16207] text-white py-2 rounded-md"
            >
              Enviar código
            </motion.button>
          </form>
        )}

        {/* Paso 2 */}
        {paso === 2 && (
          <div className="space-y-5">
            <div className="flex justify-center space-x-2">
              {codigo.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  maxLength={1}
                  value={v}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className={`w-10 h-12 text-center border rounded ${
                    i === 4 ? 'ml-4' : ''
                  }`}
                />
              ))}
            </div>
            <motion.button
              onClick={verificarCodigo}
              whileHover={{ scale: 1.05 }}
              className="w-full bg-[#a16207] text-white py-2 rounded-md"
            >
              <KeyRound size={18} className="inline-block mr-1" />
              Verificar código
            </motion.button>
          </div>
        )}

        {/* Paso 3 */}
        {paso === 3 && (
          <div className="space-y-5">
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border px-4 py-2 pr-10 rounded-md"
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute right-3 top-[9px]"
              >
                {verPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <div className="relative">
              <input
                type={verConfirmar ? 'text' : 'password'}
                placeholder="Confirmar contraseña"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full border px-4 py-2 pr-10 rounded-md"
              />
              <button
                type="button"
                onClick={() => setVerConfirmar(!verConfirmar)}
                className="absolute right-3 top-[9px]"
              >
                {verConfirmar ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <motion.button
              onClick={actualizarPassword}
              whileHover={{ scale: 1.05 }}
              className="w-full bg-[#a16207] text-white py-2 rounded-md"
            >
              Actualizar contraseña
            </motion.button>
          </div>
        )}

        {mensaje && <div className="mt-4 text-green-600 text-sm text-center">{mensaje}</div>}
        {error && <div className="mt-4 text-red-600 text-sm text-center">{error}</div>}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/iniciar-sesion')}
            className="text-sm text-[#a16207] hover:underline flex items-center gap-1 justify-center"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      </motion.div>
    </div>
  );
}
