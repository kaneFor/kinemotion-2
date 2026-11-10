import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { FormRestablecer } from "@/components/FormContrasena";

export default async function Restablecer({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-display text-3xl md:text-4xl text-ink">Elige una contraseña nueva</h1>
          {token ? (
            <FormRestablecer token={token} />
          ) : (
            <p className="mt-3 text-ink-soft">
              Este enlace no es válido.{" "}
              <Link href="/olvide-contrasena" className="text-teal-deep underline">
                Pide uno nuevo
              </Link>
              .
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
