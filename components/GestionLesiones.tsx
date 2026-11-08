"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lesiones } from "@/lib/data";
import { nombreLesion, type AccionLesion, type LesionPaciente } from "@/lib/rutina";

export default function GestionLesiones({ lista }: { lista: LesionPaciente[] }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const disponibles = lesiones.filter((l) => !lista.some((p) => p.slug === l.slug));
  const ordenadas = [...lista].sort(
    (a, b) =>
      Number(b.principal) - Number(a.principal) ||
      Number(b.estado === "activa") - Number(a.estado === "activa")
  );

  async function cambiar(accion: AccionLesion, lesion: string) {
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/lesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, lesion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          [data.error, data.pista].filter(Boolean).join(" ") ||
            "No se pudo guardar el cambio."
        );
        return;
      }
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const botonSecundario =
    "text-xs text-ink border border-line rounded-sm px-3 py-1.5 hover:border-ink transition-colors disabled:opacity-60";

  return (
    <div className="mt-4">
      <ul className="divide-y divide-line border-y border-line">
        {ordenadas.map((l) => (
          <li key={l.slug} className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className={l.estado === "activa" ? "text-ink" : "text-ink-soft"}>
                {nombreLesion(l.slug)}
              </span>
              {l.principal && (
                <span className="ml-2 label-tech text-[10px] text-teal-deep">Principal</span>
              )}
              {l.estado === "terminada" && (
                <span className="ml-2 label-tech text-[10px] text-ink-soft">Terminada</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {l.estado === "activa" ? (
                <>
                  {!l.principal && (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => cambiar("principal", l.slug)}
                      className={botonSecundario}
                    >
                      Hacer principal
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => cambiar("terminar", l.slug)}
                    className={botonSecundario}
                  >
                    Marcar como terminada
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => cambiar("reactivar", l.slug)}
                  className={botonSecundario}
                >
                  Reactivar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {disponibles.length > 0 && (
        <form
          className="mt-6 space-y-3 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const lesion = String(new FormData(form).get("lesion"));
            cambiar("agregar", lesion).then(() => form.reset());
          }}
        >
          <label htmlFor="lesion-nueva" className="block text-sm text-ink">
            Agregar otra lesión
          </label>
          <select
            id="lesion-nueva"
            name="lesion"
            required
            defaultValue=""
            className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
          >
            <option value="" disabled>
              Selecciona una lesión
            </option>
            {disponibles.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.nombre}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={enviando}
            className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
          >
            {enviando ? "Guardando…" : "Agregar lesión"}
          </button>
        </form>
      )}

      {errorMsg && <p className="mt-3 text-sm text-danger">{errorMsg}</p>}
    </div>
  );
}
