"use client";

import { useEffect, useState } from "react";
import { detenerVoz, hablar, vozDisponible } from "@/lib/voz";

export default function BotonVoz({
  texto,
  etiqueta = "Escuchar explicación",
}: {
  texto: string;
  etiqueta?: string;
}) {
  const [disponible, setDisponible] = useState(false);
  const [hablando, setHablando] = useState(false);

  useEffect(() => {
    setDisponible(vozDisponible());
    return () => detenerVoz();
  }, []);

  if (!disponible) return null;

  function alternar() {
    if (hablando) {
      detenerVoz();
      setHablando(false);
      return;
    }
    setHablando(true);
    hablar(texto, { onFin: () => setHablando(false) });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={hablando}
      className="mt-2 mr-2 inline-block text-xs font-medium text-ink border border-line rounded-sm px-2 py-1 hover:border-ink transition-colors"
    >
      {hablando ? "Detener explicación" : etiqueta}
    </button>
  );
}
