"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lesiones } from "@/lib/data";

type Estado = "formulario" | "enviando" | "error";

export default function FormRegistro() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("formulario");
  const [consiente, setConsiente] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consiente) {
      setErrorMsg("Debes aceptar el consentimiento informado para continuar.");
      return;
    }
    setErrorMsg("");
    setEstado("enviando");

    const form = new FormData(e.currentTarget);
    const payload = {
      nombre: form.get("nombre"),
      correo: form.get("correo"),
      password: form.get("password"),
      lesion: form.get("lesion"),
      consiente,
    };

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEstado("error");
        setErrorMsg(
          [data.error, data.pista].filter(Boolean).join(" ") ||
            "No se pudo completar el registro."
        );
        return;
      }
      const data = await res.json().catch(() => ({}));
      // La cuenta queda con la sesión iniciada y va directo a su rutina.
      router.push(data.sesion === false ? "/login" : "/biblioteca");
      router.refresh();
    } catch {
      setEstado("error");
      setErrorMsg(
        "No pudimos completar el registro. Revisa tu conexión e inténtalo de nuevo."
      );
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl text-ink">
        Crea tu cuenta
      </h1>
      <p className="mt-3 text-ink-soft leading-relaxed max-w-md">
        Solo pedimos lo necesario para armar tu rutina de ejercicios.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <div>
          <label htmlFor="nombre" className="block text-sm text-ink mb-2">
            Nombre completo
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label htmlFor="correo" className="block text-sm text-ink mb-2">
            Correo electrónico
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
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
            minLength={8}
            className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
            placeholder="Mínimo 8 caracteres"
          />
          <p className="mt-1.5 text-xs text-ink-soft">
            Se guarda cifrada mediante hashing, nunca en texto plano.
          </p>
        </div>

        <div>
          <label htmlFor="lesion" className="block text-sm text-ink mb-2">
            ¿Cuál es tu lesión principal?
          </label>
          <select
            id="lesion"
            name="lesion"
            required
            className="w-full border border-line bg-paper-dim/40 rounded-sm px-4 py-3 text-ink outline-none focus:border-teal"
            defaultValue=""
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
          <p className="mt-1.5 text-xs text-ink-soft">
            Después podrás agregar otras o cambiarla desde Mi cuenta.
          </p>
        </div>

        <div className="border-t border-line pt-6">
          <h2 className="font-display text-base text-ink">
            Consentimiento digital informado
          </h2>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            KineMotion no reemplaza el diagnóstico médico. Al continuar,
            confirmas que cuentas con una indicación médica o kinésica
            previa, y aceptas que tus datos clínicos se almacenen
            cifrados conforme a la Ley N° 19.628 sobre Protección de la
            Vida Privada, usados únicamente para personalizar tu rutina.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={consiente}
              onChange={(e) => setConsiente(e.target.checked)}
              className="mt-0.5"
            />
            He leído y acepto el uso de mis datos en estas condiciones.
          </label>
        </div>

        {errorMsg && (
          <p className="text-sm text-danger">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={estado === "enviando"}
          className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors disabled:opacity-60"
        >
          {estado === "enviando" ? "Creando cuenta…" : "Crear mi cuenta"}
        </button>
      </form>
      <p className="mt-8 text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-teal-deep underline">
          Inicia sesión
        </Link>
      </p>
    </section>
  );
}
