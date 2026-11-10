"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Habilitar o deshabilitar una cuenta desde /admin/cuentas. */
export default function BotonEstadoCuenta({
  id,
  nombre,
  deshabilitada,
}: {
  id: string;
  nombre: string;
  deshabilitada: boolean;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const accion = deshabilitada ? "habilitar" : "deshabilitar";

  async function cambiar() {
    if (
      !deshabilitada &&
      !window.confirm(`¿Deshabilitar la cuenta de ${nombre}? No podrá iniciar sesión hasta que la habilites de nuevo.`)
    ) {
      return;
    }
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/cuentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudo cambiar.");
        return;
      }
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={cambiar}
        disabled={enviando}
        className={
          "text-sm underline disabled:opacity-60 whitespace-nowrap " +
          (deshabilitada ? "text-teal-deep" : "text-danger")
        }
      >
        {enviando ? "Guardando…" : deshabilitada ? "Habilitar" : "Deshabilitar"}
      </button>
      {errorMsg && <span className="text-xs text-danger">{errorMsg}</span>}
    </span>
  );
}
