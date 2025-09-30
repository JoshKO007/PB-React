// src/components/StickyCursor.jsx
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const isTouch = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

export default function StickyCursor() {
  const bubbleRef = useRef(null);

  // Posición suavizada
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 });
  const smoothY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 });

  // Tamaño de la burbuja (usamos CSS var)
  const setSize = (px) => {
    if (bubbleRef.current) {
      bubbleRef.current.style.setProperty("--bubble-size", `${px}px`);
    }
  };

  useEffect(() => {
    if (isTouch()) return; // No mostrar en móviles/tablets

    const onMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    // “Magnetismo” hacia elementos con data-cursor-target
    let hoverEl = null;
    const onMouseOver = (e) => {
      const t = e.target.closest("[data-cursor-target]");
      if (t) {
        hoverEl = t;
        const rect = t.getBoundingClientRect();
        // crecer burbuja
        const custom = Number(t.getAttribute("data-cursor-size")) || 42;
        setSize(custom);

        // animar hacia el centro del target
        x.set(rect.left + rect.width / 2);
        y.set(rect.top + rect.height / 2);

        // efecto “activo”
        t.setAttribute("data-cursor-active", "true");
      }
    };

    const onMouseOut = (e) => {
      const leaving = e.target.closest("[data-cursor-target]");
      const related = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-cursor-target]");
      if (leaving && leaving !== related) {
        leaving.removeAttribute("data-cursor-active");
        setSize(24);
        hoverEl = null;
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mouseout", onMouseOut);

    // tamaño default
    setSize(24);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOut);
    };
  }, [x, y]);

  if (isTouch()) return null;

  return (
    <motion.div
      ref={bubbleRef}
      aria-hidden="true"
      style={{
        translateX: smoothX,
        translateY: smoothY,
      }}
      className="sticky-bubble"
    />
  );
}
