"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hace aparecer su contenido (fundido + leve deslizamiento hacia arriba)
 * cuando entra en pantalla al hacer scroll. Las fotos marcadas con la clase
 * `foto-zoom` además se acercan suavemente. Solo ocurre una vez.
 *
 * Usa IntersectionObserver (sin librerías). Con "reducir movimiento"
 * activado en el sistema, el contenido aparece sin animación (ver
 * globals.css).
 */
export default function Aparecer({
  children,
  retraso = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Retraso en milisegundos, para que varios elementos aparezcan en cascada. */
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`aparecer ${visible ? "aparecer-visible" : ""} ${className}`}
      style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
    >
      {children}
    </div>
  );
}
