import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PosturaCamera from "@/components/PosturaCamera";
import { obtenerUsuario } from "@/lib/sesion";
import { obtenerAcceso } from "@/lib/acceso";

export default async function Practica({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string }>;
}) {
  const { id } = await params;
  const desdeSesion = (await searchParams).desde === "sesion";
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  // Solo se puede practicar lo que el paciente tiene asignado; un ejercicio
  // fuera de su prescripción o lesión se trata igual que uno inexistente.
  const { ejercicios } = await obtenerAcceso(usuario.id);
  const ejercicio = ejercicios.find((e) => e.id === id);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-14 pb-10">
          <Link
            href={desdeSesion ? "/sesion" : "/biblioteca"}
            className="text-sm text-ink-soft hover:text-ink"
          >
            {desdeSesion ? "← Volver a la rutina de hoy" : "← Volver a mi rutina"}
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-ink mt-4 max-w-lg">
            {ejercicio ? ejercicio.nombre : "Ejercicio no disponible"}
          </h1>
          <p className="mt-2 text-ink-soft max-w-md">
            Práctica guiada con cámara (beta): analiza tu ángulo articular y
            tu postura en tiempo real, y puede avisarte por voz si conviene
            ajustar algo.
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-10 pb-20">
          {!ejercicio ? (
            <div className="max-w-xl border-t border-line pt-6 text-ink-soft text-sm">
              Este ejercicio no está en tu rutina. Solo puedes practicar los
              ejercicios que indica tu prescripción médica o, si no la
              subiste, los de las lesiones activas de tu cuenta.
            </div>
          ) : ejercicio.angleTarget ? (
            <PosturaCamera
              target={ejercicio.angleTarget}
              ejercicioId={ejercicio.id}
              desdeSesion={desdeSesion}
            />
          ) : (
            <div className="max-w-xl border-t border-line pt-6 text-ink-soft text-sm">
              Este ejercicio todavía no tiene una guía de cámara configurada.
              Por ahora la práctica guiada con cámara solo está disponible
              para ejercicios que involucran flexión de rodilla o tobillo.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
