import { useEffect, useRef } from 'react';

export default function FondoParticulas() {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const numParticles = 60;
    const particles = [];
    const colors = ['#ffffff', '#a5b4fc', '#c4b5fd'];

    for (let i = 0; i < numParticles; i++) {
      const size = Math.random() * 2 + 1;
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 50,
        size,
        speed: Math.random() * 0.5 + 0.2,
        alpha: Math.random() * 0.3 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let p of particles) {
        const fade = Math.max(0, p.y / canvas.height); // 🔁 ahora más opaco abajo, desvanecido arriba

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * fade;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        p.y -= p.speed;

        if (p.y < -10) {
          p.y = canvas.height + Math.random() * 30;
          p.x = Math.random() * canvas.width;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed bottom-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
}
