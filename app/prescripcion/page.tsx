import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FormPrescripcion from "@/components/FormPrescripcion";
import FormLesion from "@/components/FormLesion";
import { obtenerUsuario } from "@/lib/sesion";
import { obtenerAcceso } from "@/lib/acceso";
import { lesionesActivas, nombreLesion } from "@/lib/rutina";

export default async function Prescripcion() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");
  // El administrador no tiene rutina: su espacio es /admin.
  if (usuario.admin) redirect("/admin");

  const acceso = await obtenerAcceso(usuario.id);
  const p = acceso.prescripcion;
  const activas = lesionesActivas(acceso.lesionesPaciente);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-display text-3xl md:text-4xl text-ink">
            Mi prescripción médica
          </h1>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Sube el documento con la indicación de tu médico o kinesiólogo.
            Leemos la lesión y los ejercicios indicados, y tu rutina mostrará
            solo esos. Guardamos únicamente el resultado, cifrado; el archivo
            no se almacena.
          </p>

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Tu acceso actual</h2>
            {p ? (
              <div className="mt-3 text-sm text-ink-soft space-y-2">
                <p>
                  Según la prescripción{" "}
                  <span className="text-ink">{p.archivo}</span>, subida el{" "}
                  {new Date(p.subidaEn).toLocaleDateString("es-CL")}.
                </p>
                <p>
                  {p.lesiones.length > 1 ? "Lesiones detectadas:" : "Lesión detectada:"}{" "}
                  <span className="text-ink">
                    {p.lesiones.map(nombreLesion).join(", ")}
                  </span>
                </p>
                <p>
                  {p.ejercicios.length > 0
                    ? "Ejercicios de tu rutina (si una lesión no tiene ejercicios concretos en el documento, ves todos los de esa lesión):"
                    : "La prescripción no nombra ejercicios concretos, así que tienes acceso a todos los de cada lesión detectada:"}
                </p>
                <ul className="list-disc pl-5 text-ink">
                  {acceso.ejercicios.map((e) => (
                    <li key={e.id}>{e.nombre}</li>
                  ))}
                </ul>
              </div>
            ) : acceso.lesionesPaciente.length === 0 ? (
              <>
                <p className="mt-3 text-sm text-ink-soft">
                  No has subido una prescripción y no pudimos leer las lesiones
                  de tu perfil. Elige la principal de nuevo o sube tu
                  prescripción abajo.
                </p>
                <FormLesion />
              </>
            ) : activas.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                No has subido una prescripción y todas tus lesiones están
                marcadas como terminadas. Puedes cambiarlas en{" "}
                <Link href="/cuenta" className="text-teal-deep underline">
                  Mi cuenta
                </Link>
                .
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">
                No has subido una prescripción. Ves los{" "}
                {acceso.ejercicios.length} ejercicios de{" "}
                <span className="text-ink">
                  {activas.map((l) => nombreLesion(l.slug)).join(", ")}
                </span>
                , las lesiones activas de{" "}
                <Link href="/cuenta" className="text-teal-deep underline">
                  Mi cuenta
                </Link>
                .
              </p>
            )}
            <Link
              href="/biblioteca"
              className="mt-4 inline-block text-sm text-teal-deep underline"
            >
              Ir a mi rutina
            </Link>
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <FormPrescripcion tienePrescripcion={Boolean(p)} />
          </div>

          <p className="mt-10 text-xs text-ink-soft leading-relaxed">
            La lectura es automática y puede equivocarse: revisa que los
            ejercicios coincidan con lo que te indicaron. Ante cualquier duda,
            sigue siempre la indicación de tu profesional.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
