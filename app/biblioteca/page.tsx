import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BibliotecaFiltro from "@/components/BibliotecaFiltro";
import FormLesion from "@/components/FormLesion";
import { obtenerUsuario } from "@/lib/sesion";
import { obtenerAcceso } from "@/lib/acceso";
import { leerDia } from "@/lib/historial";
import { estadoRutina } from "@/lib/progreso";
import { hoyEnChile } from "@/lib/recordatorios";
import { lesionesActivas, nombreLesion } from "@/lib/rutina";

export default async function Biblioteca() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  const acceso = await obtenerAcceso(usuario.id);
  const activas = lesionesActivas(acceso.lesionesPaciente);
  const diaHoy = await leerDia(usuario.id, hoyEnChile());
  const hoy = estadoRutina(
    acceso.ejercicios.map((e) => e.id),
    diaHoy
  );
  const total = acceso.ejercicios.length;

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
            ) : acceso.lesionesPaciente.length === 0 ? (
              <>
                <p>
                  No pudimos leer las lesiones guardadas en tu perfil. Elige la
                  principal de nuevo para ver tus ejercicios, o{" "}
                  <Link href="/prescripcion" className="text-teal-deep underline">
                    sube tu prescripción
                  </Link>
                  .
                </p>
                <FormLesion />
              </>
            ) : activas.length === 0 ? (
              <p>
                Todas tus lesiones están marcadas como terminadas. Si necesitas
                seguir ejercitándote, agrega o reactiva una en{" "}
                <Link href="/cuenta" className="text-teal-deep underline">
                  Mi cuenta
                </Link>
                .
              </p>
            ) : (
              <p>
                Ejercicios para{" "}
                <span className="text-ink">
                  {activas.map((l) => nombreLesion(l.slug)).join(", ")}
                </span>
                . Puedes agregar o cambiar tus lesiones en{" "}
                <Link href="/cuenta" className="text-teal-deep underline">
                  Mi cuenta
                </Link>
                . Si tienes una prescripción médica, súbela para ver solo los
                ejercicios que te indicaron.{" "}
                <Link href="/prescripcion" className="text-teal-deep underline">
                  Subir prescripción
                </Link>
              </p>
            )}
            {!usuario.correoVerificado && (
              <p className="mt-3">
                Confirma tu correo para recibir recordatorios.{" "}
                <Link href="/cuenta" className="text-teal-deep underline">
                  Ir a Mi cuenta
                </Link>
              </p>
            )}
          </div>
        </section>

        {total > 0 && (
          <section className="max-w-6xl mx-auto px-6 md:px-10 pb-4">
            <div className="max-w-xl border border-line rounded-sm p-5">
              <p className="label-tech text-xs text-ink-soft">Rutina de hoy</p>
              <p className="mt-1 font-display text-lg text-ink">
                {diaHoy.suspendido
                  ? "Suspendida por dolor"
                  : hoy.completa
                  ? "✓ Completa"
                  : `${hoy.hechos.length} de ${total} ejercicios hechos`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {!hoy.completa && !diaHoy.suspendido && (
                  <Link
                    href="/sesion"
                    className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors"
                  >
                    {hoy.hechos.length === 0 ? "Empezar rutina de hoy" : "Continuar rutina"}
                  </Link>
                )}
                <Link href="/progreso" className="text-sm text-teal-deep underline">
                  Ver mi progreso
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="max-w-6xl mx-auto px-6 md:px-10 py-6">
          <BibliotecaFiltro
            hechosHoy={hoy.hechos}
            ejercicios={acceso.ejercicios}
            principal={
              acceso.origen === "lesion" ? activas.find((l) => l.principal)?.slug : undefined
            }
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
