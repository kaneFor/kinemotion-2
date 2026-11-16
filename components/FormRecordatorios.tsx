"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatoHora, HORAS_RECORDATORIO, type ModoRecordatorio } from "@/lib/recordatorios";

const OPCIONES: { modo: ModoRecordatorio; titulo: string; detalle: string }[] = [
  { modo: "apagado", titulo: "Apagados", detalle: "No te enviaremos recordatorios." },
  {
    modo: "personalizado",
    titulo: "En mis días de rutina",
    detalle: "Te escribimos en tus días de rutina, si ese día no la completas.",
  },
  {
    modo: "inactividad",
    titulo: "Cada día sin completar mi rutina",
    detalle: "Te escribimos cada día que no completes tu rutina.",
  },
];

export default function FormRecordatorios({
  inicial,
  horaInicial,
  correoVerificado,
}: {
  inicial: ModoRecordatorio;
  horaInicial: number;
  correoVerificado: boolean;
}) {
  const router = useRouter();
  const [modo, setModo] = useState(inicial);
  const [hora, setHora] = useState(horaInicial);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setMensaje("");
    setEnviando(true);
    try {
      const res = await fetch("/api/recordatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, hora }),
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

        <label className="flex flex-wrap items-center gap-3 text-sm text-ink pt-2">
          Hora del recordatorio
          <select
            value={hora}
            onChange={(e) => setHora(Number(e.target.value))}
            disabled={modo === "apagado"}
            className="border border-line bg-paper-dim/40 rounded-sm px-3 py-2 text-ink outline-none focus:border-teal disabled:opacity-60"
          >
            {HORAS_RECORDATORIO.map((h) => (
              <option key={h} value={h}>
                {formatoHora(h)}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <p className="text-xs text-ink-soft">
        Te escribimos una vez al día, dentro de la hora que elijas (hora de
        Chile). Si el envío falla, lo reintentamos más tarde ese mismo día.
        Puedes darte de baja desde cualquier correo.
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
