"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormPrescripcion({ tienePrescripcion }: { tienePrescripcion: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);
    const formEl = e.currentTarget;
    try {
      const res = await fetch("/api/prescripcion", {
        method: "POST",
        body: new FormData(formEl),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(
          [data.error, data.pista].filter(Boolean).join(" ") ||
            "No se pudo subir la prescripción."
        );
        return;
      }
      formEl.reset();
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function quitar() {
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/prescripcion", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudo quitar la prescripción.");
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
    <div>
      <form onSubmit={subir} className="space-y-4">
        <label htmlFor="archivo" className="block text-sm text-ink">
          {tienePrescripcion ? "Reemplazar por una nueva prescripción" : "Documento de la prescripción"}
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          required
          accept="application/pdf,.pdf,text/plain,.txt"
          className="block w-full text-sm text-ink-soft file:mr-4 file:border file:border-line file:bg-paper-dim/40 file:rounded-sm file:px-4 file:py-2 file:text-ink"
        />
        <p className="text-xs text-ink-soft">
          PDF digital o .txt, máximo 5 MB. Las fotos o escaneos sin texto
          todavía no se pueden leer.
        </p>
        {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
          >
            {enviando ? "Procesando…" : "Subir prescripción"}
          </button>
          {tienePrescripcion && (
            <button
              type="button"
              onClick={quitar}
              disabled={enviando}
              className="px-6 py-3 rounded-sm font-medium text-ink border border-line hover:border-ink transition-colors disabled:opacity-60"
            >
              Quitar prescripción
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
