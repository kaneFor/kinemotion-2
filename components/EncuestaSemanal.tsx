"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PREGUNTAS = [
  {
    clave: "utilidad",
    texto: "¿Qué tan útil te resultó la guía de los ejercicios?",
    extremos: ["Nada útil", "Muy útil"],
  },
  {
    clave: "claridad",
    texto: "¿Qué tan claras fueron las instrucciones?",
    extremos: ["Nada claras", "Muy claras"],
  },
  {
    clave: "dificultad",
    texto: "¿Qué tan difíciles te parecieron los ejercicios?",
    extremos: ["Muy fáciles", "Muy difíciles"],
  },
] as const;

type Clave = (typeof PREGUNTAS)[number]["clave"];

export default function EncuestaSemanal({ permitirOmitir = true }: { permitirOmitir?: boolean }) {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Partial<Record<Clave, number>>>({});
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const completa = PREGUNTAS.every((p) => respuestas[p.clave]);

  async function enviar(cuerpo: object) {
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/encuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudo guardar la encuesta.");
        return;
      }
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      className="mt-4 border border-line rounded-sm p-5 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (completa) enviar({ ...respuestas, comentario: comentario.trim() || undefined });
      }}
    >
      <h3 className="font-display text-lg text-ink">¿Cómo sentiste los ejercicios esta semana?</h3>
      <p className="mt-1 text-xs text-ink-soft">Son tres preguntas. Tus respuestas se guardan cifradas.</p>

      {PREGUNTAS.map((p) => (
        <fieldset key={p.clave} className="mt-5">
          <legend className="text-sm text-ink">{p.texto}</legend>
          <div className="mt-2 grid grid-cols-5 gap-2 max-w-xs">
            {[1, 2, 3, 4, 5].map((v) => {
              const on = respuestas[p.clave] === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${v} de 5`}
                  onClick={() => setRespuestas((r) => ({ ...r, [p.clave]: v }))}
                  className={
                    "h-10 rounded-sm border font-medium transition-colors " +
                    (on ? "bg-ink text-paper border-ink" : "border-line text-ink hover:border-ink")
                  }
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between max-w-xs text-xs text-ink-soft">
            <span>{p.extremos[0]}</span>
            <span>{p.extremos[1]}</span>
          </div>
        </fieldset>
      ))}

      <label htmlFor="comentario" className="mt-5 block text-sm text-ink">
        ¿Algo que quieras contarnos? (opcional)
      </label>
      <textarea
        id="comentario"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={1000}
        rows={3}
        className="mt-2 w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-sm text-ink outline-none focus:border-teal"
      />

      {errorMsg && <p className="mt-3 text-sm text-danger">{errorMsg}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={enviando || !completa}
          className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
        {permitirOmitir && (
          <button
            type="button"
            disabled={enviando}
            onClick={() => enviar({ omitir: true })}
            className="text-sm text-ink-soft underline hover:text-ink"
          >
            Ahora no
          </button>
        )}
      </div>
    </form>
  );
}
