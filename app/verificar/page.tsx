import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ConfirmarAccion from "@/components/ConfirmarAccion";

export default async function Verificar({
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
          <h1 className="font-display text-3xl md:text-4xl text-ink">
            Confirma tu correo
          </h1>
          {token ? (
            <ConfirmarAccion
              url="/api/correo/confirmar"
              cuerpo={{ token }}
              boton="Confirmar mi correo"
              exito="Tu correo quedó confirmado. Ya puedes activar los recordatorios."
            />
          ) : (
            <p className="mt-3 text-ink-soft">
              Este enlace no es válido. Pide uno nuevo en Mi cuenta.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
