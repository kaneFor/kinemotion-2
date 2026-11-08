import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function CuentaEliminada() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-display text-3xl md:text-4xl text-ink">Tu cuenta fue eliminada</h1>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Borramos tu cuenta y todos sus datos: tu perfil clínico, tus
            lesiones y tu historial. Gracias por usar KineMotion. Si lo
            necesitas, puedes crear una cuenta nueva cuando quieras.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-teal-deep underline">
            Ir al inicio
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
