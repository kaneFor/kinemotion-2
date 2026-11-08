"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EliminarCuenta() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmo, setConfirmo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/cuenta/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get("password-eliminar"),
          confirmo,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "No se pudo eliminar la cuenta.");
        return;
      }
      router.push("/cuenta-eliminada");
      router.refresh();
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-6 text-sm font-medium text-danger border border-danger/40 px-4 py-2 rounded-sm hover:border-danger transition-colors"
      >
        Eliminar mi cuenta
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-3 border border-danger/40 rounded-sm p-4">
      <p className="text-sm text-ink">
        Se borrarán tu cuenta, tu perfil clínico, tus lesiones y todo tu
        historial. Si quieres conservar una copia, descarga tus datos antes.
      </p>
      <label htmlFor="password-eliminar" className="block text-sm text-ink">
        Tu contraseña
      </label>
      <input
        id="password-eliminar"
        name="password-eliminar"
        type="password"
        required
        autoComplete="current-password"
        className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
      />
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={confirmo}
          onChange={(e) => setConfirmo(e.target.checked)}
          className="mt-0.5"
        />
        Entiendo que esto no se puede deshacer.
      </label>
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={enviando || !confirmo}
          className="text-sm font-medium bg-danger text-paper px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {enviando ? "Eliminando…" : "Eliminar mi cuenta definitivamente"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setConfirmo(false);
            setErrorMsg("");
          }}
          className="text-sm font-medium border border-line text-ink px-4 py-2 rounded-sm hover:border-ink transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
