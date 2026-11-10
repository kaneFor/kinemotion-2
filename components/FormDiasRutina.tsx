"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_SEMANA } from "@/lib/progreso";

export default function FormDiasRutina({ inicial }: { inicial: number[] }) {
  const router = useRouter();
  const [dias, setDias] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const alternar = (dia: number) =>
    setDias((d) => (d.includes(dia) ? d.filter((x) => x !== dia) : [...d, dia]));

  async function guardar() {
    setErrorMsg("");
    setMensaje("");
    setEnviando(true);
    try {
      const res = await fetch("/api/cuenta/dias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dias }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudieron guardar tus días.");
        return;
      }
      setMensaje("Días guardados.");
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 max-w-md">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Días de rutina">
        {DIAS_SEMANA.map((d) => {
          const on = dias.includes(d.valor);
          return (
            <button
              key={d.valor}
              type="button"
              aria-pressed={on}
              onClick={() => alternar(d.valor)}
              className={
                "text-sm px-3 py-1.5 rounded-sm border transition-colors " +
                (on
                  ? "bg-ink text-paper border-ink"
                  : "border-line text-ink-soft hover:border-ink hover:text-ink")
              }
            >
              {d.nombre}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={guardar}
        disabled={enviando || dias.length === 0}
        className="mt-4 text-sm font-medium border border-line text-ink px-4 py-2 rounded-sm hover:border-ink transition-colors disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Guardar días"}
      </button>
      {dias.length === 0 && <p className="mt-2 text-sm text-ink-soft">Elige al menos un día.</p>}
      {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
      {mensaje && <p className="mt-2 text-sm text-teal-deep">{mensaje}</p>}
    </div>
  );
}
