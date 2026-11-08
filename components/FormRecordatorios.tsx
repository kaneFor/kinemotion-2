"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_SEMANA, type ModoRecordatorio, type Recordatorios } from "@/lib/recordatorios";

const OPCIONES: { modo: ModoRecordatorio; titulo: string; detalle: string }[] = [
  { modo: "apagado", titulo: "Apagados", detalle: "No te enviaremos recordatorios." },
  {
    modo: "personalizado",
    titulo: "Personalizado",
    detalle: "Te escribimos los días que elijas, si ese día aún no entras a tu rutina.",
  },
  {
    modo: "inactividad",
    titulo: "Cada día sin ejercitarme",
    detalle: "Te escribimos cada día que no entres a tu rutina.",
  },
];

export default function FormRecordatorios({
  inicial,
  correoVerificado,
}: {
  inicial: Recordatorios;
  correoVerificado: boolean;
}) {
  const router = useRouter();
  const [modo, setModo] = useState(inicial.modo);
  const [dias, setDias] = useState(inicial.dias);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const alternarDia = (dia: number) =>
    setDias((d) => (d.includes(dia) ? d.filter((x) => x !== dia) : [...d, dia]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setMensaje("");
    setEnviando(true);
    try {
      const res = await fetch("/api/recordatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, dias }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudieron guardar tus recordatorios.");
        return;
      }
      setMensaje("Recordatorios guardados.");
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 max-w-md">
      <fieldset disabled={!correoVerificado} className="space-y-3 disabled:opacity-60">
        {OPCIONES.map((o) => (
          <label key={o.modo} className="flex items-start gap-3 text-sm text-ink">
            <input
              type="radio"
              name="modo"
              checked={modo === o.modo}
              onChange={() => setModo(o.modo)}
              className="mt-1"
            />
            <span>
              {o.titulo}
              <span className="block text-xs text-ink-soft">{o.detalle}</span>
            </span>
          </label>
        ))}

        {modo === "personalizado" && (
          <div className="flex flex-wrap gap-2 pl-6">
            {DIAS_SEMANA.map((d) => {
              const on = dias.includes(d.valor);
              return (
                <button
                  key={d.valor}
                  type="button"
                  aria-pressed={on}
                  onClick={() => alternarDia(d.valor)}
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
        )}
      </fieldset>

      <p className="text-xs text-ink-soft">
        Los correos salen una vez al día, por la tarde (hora de Chile). Puedes
        darte de baja desde cualquiera de ellos.
      </p>
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      {mensaje && <p className="text-sm text-teal-deep">{mensaje}</p>}
      <button
        type="submit"
        disabled={enviando || !correoVerificado}
        className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Guardar recordatorios"}
      </button>
    </form>
  );
}
