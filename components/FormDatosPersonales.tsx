"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const campo =
  "w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal";
const boton =
  "text-sm font-medium border border-line text-ink px-4 py-2 rounded-sm hover:border-ink transition-colors disabled:opacity-60";

function useEnvio() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function enviar(url: string, cuerpo: unknown, exito: (data: Record<string, unknown>) => string) {
    setErrorMsg("");
    setMensaje("");
    setEnviando(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "No se pudo guardar el cambio.");
        return false;
      }
      setMensaje(exito(data));
      router.refresh();
      return true;
    } catch {
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { enviar, enviando, mensaje, errorMsg };
}

export function FormNombre({ nombre }: { nombre: string }) {
  const { enviar, enviando, mensaje, errorMsg } = useEnvio();

  return (
    <form
      className="mt-4 max-w-md space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        enviar("/api/cuenta/nombre", { nombre: new FormData(e.currentTarget).get("nombre") }, () => "Nombre guardado.");
      }}
    >
      <label htmlFor="nombre" className="block text-sm text-ink">
        Nombre
      </label>
      <input id="nombre" name="nombre" required maxLength={100} defaultValue={nombre} className={campo} />
      <button type="submit" disabled={enviando} className={boton}>
        {enviando ? "Guardando…" : "Guardar nombre"}
      </button>
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      {mensaje && <p className="text-sm text-teal-deep">{mensaje}</p>}
    </form>
  );
}

export function FormCorreo() {
  const { enviar, enviando, mensaje, errorMsg } = useEnvio();

  return (
    <form
      className="mt-6 max-w-md space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const datos = new FormData(form);
        const ok = await enviar(
          "/api/cuenta/correo",
          { correo: datos.get("correo-nuevo"), password: datos.get("password-correo") },
          (data) =>
            data.enviado === false
              ? "Correo cambiado, pero no pudimos enviar el enlace de confirmación. Usa el botón para reenviarlo."
              : "Correo cambiado. Te enviamos un enlace para confirmarlo; los recordatorios quedan en pausa hasta entonces."
        );
        if (ok) form.reset();
      }}
    >
      <label htmlFor="correo-nuevo" className="block text-sm text-ink">
        Cambiar correo
      </label>
      <input
        id="correo-nuevo"
        name="correo-nuevo"
        type="email"
        required
        placeholder="nuevo@correo.cl"
        className={campo}
      />
      <label htmlFor="password-correo" className="block text-sm text-ink">
        Tu contraseña
      </label>
      <input
        id="password-correo"
        name="password-correo"
        type="password"
        required
        autoComplete="current-password"
        className={campo}
      />
      <p className="text-xs text-ink-soft">
        Desde ahora iniciarás sesión con el correo nuevo. Te enviaremos un
        enlace para confirmarlo.
      </p>
      <button type="submit" disabled={enviando} className={boton}>
        {enviando ? "Cambiando…" : "Cambiar correo"}
      </button>
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      {mensaje && <p className="text-sm text-teal-deep">{mensaje}</p>}
    </form>
  );
}
