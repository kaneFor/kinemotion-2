"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lesiones } from "@/lib/data";

/** Para perfiles cuya lesión no se pudo leer: la vuelve a pedir. */
export default function FormLesion() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/lesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "agregar",
          lesion: new FormData(e.currentTarget).get("lesion"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          [data.error, data.pista].filter(Boolean).join(" ") ||
            "No se pudo guardar la lesión."
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

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 max-w-md">
      <label htmlFor="lesion" className="block text-sm text-ink">
        ¿Cuál es tu lesión principal?
      </label>
      <select
        id="lesion"
        name="lesion"
        required
        defaultValue=""
        className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
      >
        <option value="" disabled>
          Selecciona una lesión
        </option>
        {lesiones.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.nombre}
          </option>
        ))}
      </select>
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Guardar lesión"}
      </button>
    </form>
  );
}
