"use client";

import { useState } from "react";

export default function BotonReenviarCorreo() {
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function reenviar() {
    setErrorMsg("");
    setMensaje("");
    setEnviando(true);
    try {
      const res = await fetch("/api/correo/reenviar", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudo enviar el correo.");
        return;
      }
      setMensaje("Te enviamos un correo nuevo. Revisa también la carpeta de spam.");
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={reenviar}
        disabled={enviando}
        className="text-sm font-medium border border-line text-ink px-4 py-2 rounded-sm hover:border-ink transition-colors disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Reenviar correo de confirmación"}
      </button>
      {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
      {mensaje && <p className="mt-2 text-sm text-teal-deep">{mensaje}</p>}
    </div>
  );
}
