"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventoProgreso } from "@/lib/progreso";

/** Envía un cambio del avance de hoy y recarga la página con el nuevo estado. */
export function useProgreso() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function enviar(evento: EventoProgreso): Promise<boolean> {
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evento),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          [data.error, data.pista].filter(Boolean).join(" ") || "No se pudo guardar tu avance."
        );
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { enviar, enviando, errorMsg };
}

const botonPrincipal =
  "bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60";
const botonSecundario =
  "px-6 py-3 rounded-sm font-medium text-ink border border-line hover:border-ink transition-colors disabled:opacity-60";

export function AccionesEjercicio({ ejercicioId }: { ejercicioId: string }) {
  const { enviar, enviando, errorMsg } = useProgreso();

  async function hacer(accion: "hecho" | "saltar") {
    if (await enviar({ accion, ejercicioId })) window.scrollTo({ top: 0 });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={enviando} onClick={() => hacer("hecho")} className={botonPrincipal}>
          {enviando ? "Guardando…" : "Terminé este ejercicio"}
        </button>
        <button type="button" disabled={enviando} onClick={() => hacer("saltar")} className={botonSecundario}>
          Saltar
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Salta el ejercicio si te duele o hoy no puedes hacerlo. Quedará como no realizado.
      </p>
      {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
    </div>
  );
}

export function BotonReintentar({ cantidad }: { cantidad: number }) {
  const { enviar, enviando, errorMsg } = useProgreso();
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={enviando}
        onClick={() => enviar({ accion: "reintentar" })}
        className={botonSecundario}
      >
        {cantidad === 1 ? "Intentar el ejercicio saltado" : `Intentar los ${cantidad} ejercicios saltados`}
      </button>
      {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
    </div>
  );
}

export function PreguntaDolor({
  momento,
  omitir,
}: {
  momento: "antes" | "despues";
  omitir: string;
}) {
  const { enviar, enviando, errorMsg } = useProgreso();

  return (
    <div>
      <h2 className="font-display text-xl text-ink">
        {momento === "antes"
          ? "Antes de empezar, ¿cuánto dolor tienes ahora?"
          : "Terminaste. ¿Cuánto dolor tienes ahora?"}
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        0 es sin dolor y 10 es el peor dolor que puedas imaginar. Es opcional,
        pero ayuda a ver cómo evoluciona tu recuperación.
      </p>
      <div className="mt-5 grid grid-cols-6 sm:grid-cols-11 gap-2 max-w-xl" role="group" aria-label="Nivel de dolor">
        {Array.from({ length: 11 }, (_, valor) => (
          <button
            key={valor}
            type="button"
            disabled={enviando}
            onClick={() => enviar({ accion: "dolor", momento, valor })}
            aria-label={`Dolor ${valor} de 10`}
            className="h-11 rounded-sm border border-line text-ink font-medium hover:border-ink hover:bg-paper-dim transition-colors disabled:opacity-60"
          >
            {valor}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between max-w-xl text-xs text-ink-soft">
        <span>Sin dolor</span>
        <span>Máximo</span>
      </div>
      <Link href={omitir} className="mt-6 inline-block text-sm text-teal-deep underline">
        {momento === "antes" ? "Empezar sin responder" : "Omitir"}
      </Link>
      {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
    </div>
  );
}

export function MarcaHecho({ ejercicioId }: { ejercicioId: string }) {
  const { enviar, enviando, errorMsg } = useProgreso();
  return (
    <p className="mt-2 text-xs">
      <span className="text-teal-deep font-medium">✓ Hecho hoy</span>{" "}
      <button
        type="button"
        disabled={enviando}
        onClick={() => enviar({ accion: "deshacer", ejercicioId })}
        className="text-ink-soft underline hover:text-ink disabled:opacity-60"
      >
        Desmarcar
      </button>
      {errorMsg && <span className="block text-danger">{errorMsg}</span>}
    </p>
  );
}
