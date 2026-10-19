import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BibliotecaFiltro from "@/components/BibliotecaFiltro";
import FormLesion from "@/components/FormLesion";
import { obtenerUsuario } from "@/lib/sesion";
import { obtenerAcceso } from "@/lib/acceso";
import { lesiones } from "@/lib/data";

export default async function Biblioteca() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  const acceso = await obtenerAcceso(usuario.id);
  const lesionRegistro = lesiones.find((l) => l.slug === acceso.lesionRegistro);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-14 pb-8">
          <h1 className="font-display text-3xl md:text-4xl text-ink max-w-lg">
            Mi rutina de ejercicios
          </h1>
          <div className="mt-4 max-w-xl border-l-2 border-teal pl-4 text-sm text-ink-soft leading-relaxed">
            {acceso.origen === "prescripcion" ? (
              <p>
                Estos son los ejercicios que indica tu prescripción médica
                {acceso.prescripcion && (
                  <> (<span className="text-ink">{acceso.prescripcion.archivo}</span>)</>
                )}
                . Solo tienes acceso a los ejercicios indicados.{" "}
                <Link href="/prescripcion" className="text-teal-deep underline">
                  Ver o cambiar prescripción
                </Link>
              </p>
            ) : !lesionRegistro ? (
              <>
                <p>
                  No pudimos leer la lesión guardada en tu perfil. Elígela de
                  nuevo para ver tus ejercicios, o{" "}
                  <Link href="/prescripcion" className="text-teal-deep underline">
                    sube tu prescripción
                  </Link>
                  .
                </p>
                <FormLesion />
              </>
            ) : (
              <p>
                Ejercicios para{" "}
                <span className="text-ink">
                  {lesionRegistro?.nombre ?? "tu lesión"}
                </span>
                , la lesión que elegiste al crear tu cuenta. Si tienes una
                prescripción médica, súbela para ver solo los ejercicios que
                te indicaron.{" "}
                <Link href="/prescripcion" className="text-teal-deep underline">
                  Subir prescripción
                </Link>
              </p>
            )}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-10 py-6">
          <BibliotecaFiltro ejercicios={acceso.ejercicios} />
        </section>
      </main>
      <Footer />
    </>
  );
}
