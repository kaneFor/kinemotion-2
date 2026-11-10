"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FormLogin() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setEnviando(true);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: form.get("correo"),
          password: form.get("password"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEnviando(false);
        setErrorMsg(
          [data.error, data.pista].filter(Boolean).join(" ") ||
            "No se pudo iniciar sesión."
        );
        return;
      }
      router.push("/biblioteca");
      router.refresh();
    } catch {
      setEnviando(false);
      setErrorMsg("Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  return (
    <section className="max-w-md mx-auto px-6 md:px-10 py-16 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl text-ink">
        Inicia sesión
      </h1>
      <p className="mt-3 text-ink-soft leading-relaxed">
        Entra para ver tu rutina de ejercicios.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <div>
          <label htmlFor="correo" className="block text-sm text-ink mb-2">
            Correo electrónico
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
            autoComplete="email"
            className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
            placeholder="tu@correo.cl"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-ink mb-2">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
          />
          <Link href="/olvide-contrasena" className="mt-2 inline-block text-sm text-teal-deep underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-8 text-sm text-ink-soft">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-teal-deep underline">
          Créala aquí
        </Link>
      </p>
    </section>
  );
}
