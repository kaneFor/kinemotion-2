"use client";

import { useState } from "react";
import Link from "next/link";

const campo =
  "w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal";
const botonPrincipal =
  "bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60";

async function enviar(url: string, cuerpo: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || "No se pudo completar. Intenta más tarde.";
  } catch {
    return "Revisa tu conexión e inténtalo de nuevo.";
  }
}

/** "¿Olvidaste tu contraseña?": pide el enlace por correo. */
export function FormOlvide() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (enviado) {
    return (
      <p className="mt-8 text-ink leading-relaxed">
        Si ese correo tiene una cuenta en KineMotion, te enviamos un enlace para
        elegir una contraseña nueva. Dura 1 hora. Revisa también la carpeta de spam.
      </p>
    );
  }

  return (
    <form
      className="mt-8 space-y-4 max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setEnviando(true);
        const error = await enviar("/api/contrasena/olvide", {
          correo: new FormData(e.currentTarget).get("correo"),
        });
        setEnviando(false);
        if (error) setErrorMsg(error);
        else setEnviado(true);
      }}
    >
      <label htmlFor="correo" className="block text-sm text-ink">
        Correo de tu cuenta
      </label>
      <input id="correo" name="correo" type="email" required autoComplete="email" className={campo} />
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      <button type="submit" disabled={enviando} className={botonPrincipal}>
        {enviando ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}

function CamposNueva({ prefijo }: { prefijo: string }) {
  return (
    <>
      <label htmlFor={`${prefijo}-nueva`} className="block text-sm text-ink">
        Contraseña nueva
      </label>
      <input
        id={`${prefijo}-nueva`}
        name="nueva"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        className={campo}
      />
      <label htmlFor={`${prefijo}-repetida`} className="block text-sm text-ink">
        Repite la contraseña nueva
      </label>
      <input
        id={`${prefijo}-repetida`}
        name="repetida"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        className={campo}
      />
    </>
  );
}

/** Elegir la contraseña nueva desde el enlace del correo. */
export function FormRestablecer({ token }: { token: string }) {
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (listo) {
    return (
      <div className="mt-8">
        <p className="text-ink">
          Tu contraseña cambió. Cerramos las sesiones abiertas en otros
          dispositivos por seguridad.
        </p>
        <Link href="/login" className={`mt-6 inline-block ${botonPrincipal}`}>
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-8 space-y-4 max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        if (datos.get("nueva") !== datos.get("repetida")) {
          setErrorMsg("Las contraseñas no coinciden.");
          return;
        }
        setErrorMsg("");
        setEnviando(true);
        const error = await enviar("/api/contrasena/restablecer", { token, password: datos.get("nueva") });
        setEnviando(false);
        if (error) setErrorMsg(error);
        else setListo(true);
      }}
    >
      <CamposNueva prefijo="restablecer" />
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      <button type="submit" disabled={enviando} className={botonPrincipal}>
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

/** Cambiar la contraseña desde Mi cuenta. */
export function FormCambiarContrasena() {
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <form
      className="mt-6 space-y-3 max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const datos = new FormData(form);
        setMensaje("");
        if (datos.get("nueva") !== datos.get("repetida")) {
          setErrorMsg("Las contraseñas nuevas no coinciden.");
          return;
        }
        setErrorMsg("");
        setEnviando(true);
        const error = await enviar("/api/cuenta/contrasena", {
          actual: datos.get("actual"),
          nueva: datos.get("nueva"),
        });
        setEnviando(false);
        if (error) {
          setErrorMsg(error);
          return;
        }
        form.reset();
        setMensaje("Contraseña cambiada. Cerramos tus sesiones en otros dispositivos.");
      }}
    >
      <p className="text-sm text-ink">Cambiar contraseña</p>
      <label htmlFor="cuenta-actual" className="block text-sm text-ink">
        Contraseña actual
      </label>
      <input
        id="cuenta-actual"
        name="actual"
        type="password"
        required
        autoComplete="current-password"
        className={campo}
      />
      <CamposNueva prefijo="cuenta" />
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      {mensaje && <p className="text-sm text-teal-deep">{mensaje}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="text-sm font-medium border border-line text-ink px-4 py-2 rounded-sm hover:border-ink transition-colors disabled:opacity-60"
      >
        {enviando ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
