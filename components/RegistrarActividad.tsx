"use client";

import { useEffect } from "react";

/**
 * Corre al abrir la página en el navegador, no al renderizarla en el
 * servidor: Next.js puede precargar una página que nadie llegó a visitar.
 */
export default function RegistrarActividad() {
  useEffect(() => {
    fetch("/api/actividad", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
