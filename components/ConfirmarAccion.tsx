"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Botón para las páginas a las que se llega desde un correo. Necesita un clic
 * porque los filtros de correo abren los enlaces por su cuenta.
 */
export default function ConfirmarAccion({
  url,
  cuerpo,
  boton,
  exito,
}: {
  url: string;
  cuerpo?: unknown;
  boton: string;
  exito: string;
}) {
  const [estado, setEstado] = useState<"listo" | "enviando" | "hecho">("listo");
  const [errorMsg, setErrorMsg] = useState("");

  async function confirmar() {
    setErrorMsg("");
    setEstado("enviando");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudo completar. Intenta más tarde.");
        setEstado("listo");
        return;
      }
      setEstado("hecho");
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
      setEstado("listo");
    }
  }

  if (estado === "hecho") {
    return (
      <div className="mt-6">
        <p className="text-ink">{exito}</p>
        <Link href="/cuenta" className="mt-4 inline-block text-sm text-teal-deep underline">
          Ir a mi cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {errorMsg && <p className="mb-4 text-sm text-danger">{errorMsg}</p>}
      <button
        type="button"
        onClick={confirmar}
        disabled={estado === "enviando"}
        className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
      >
        {estado === "enviando" ? "Procesando…" : boton}
      </button>
    </div>
  );
}
