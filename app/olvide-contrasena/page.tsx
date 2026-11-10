import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { FormOlvide } from "@/components/FormContrasena";

export default function OlvideContrasena() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-display text-3xl md:text-4xl text-ink">¿Olvidaste tu contraseña?</h1>
          <p className="mt-3 text-ink-soft leading-relaxed max-w-md">
            Escribe el correo de tu cuenta y te enviaremos un enlace para
            elegir una contraseña nueva.
          </p>
          <FormOlvide />
          <p className="mt-8 text-sm text-ink-soft">
            <Link href="/login" className="text-teal-deep underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
