import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BotonReenviarCorreo from "@/components/BotonReenviarCorreo";
import EliminarCuenta from "@/components/EliminarCuenta";
import { FormCambiarContrasena } from "@/components/FormContrasena";
import { FormCorreo, FormNombre } from "@/components/FormDatosPersonales";
import FormDiasRutina from "@/components/FormDiasRutina";
import FormLesion from "@/components/FormLesion";
import FormRecordatorios from "@/components/FormRecordatorios";
import GestionLesiones from "@/components/GestionLesiones";
import { obtenerAcceso } from "@/lib/acceso";
import { getDb } from "@/lib/mongodb";
import { diasDeRutina } from "@/lib/progreso";
import type { Recordatorios } from "@/lib/recordatorios";
import { nombreLesion } from "@/lib/rutina";
import { obtenerUsuario } from "@/lib/sesion";

export default async function Cuenta() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  const acceso = await obtenerAcceso(usuario.id);
  const db = await getDb();
  const preferencias = await db
    .collection("usuarios")
    .findOne({ _id: new ObjectId(usuario.id) }, { projection: { recordatorios: 1, diasRutina: 1 } });
  const recordatorios = preferencias?.recordatorios as Recordatorios | undefined;
  const dias = diasDeRutina({ diasRutina: preferencias?.diasRutina, recordatorios });

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-display text-3xl md:text-4xl text-ink">Mi cuenta</h1>
          <p className="mt-3 text-sm text-ink-soft">
            <Link href="/biblioteca" className="text-teal-deep underline">
              Ir a mi rutina
            </Link>
            {" · "}
            <Link href="/progreso" className="text-teal-deep underline">
              Mi progreso
            </Link>
          </p>

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Mis lesiones</h2>
            {acceso.prescripcion ? (
              <div className="mt-3 text-sm text-ink-soft space-y-2">
                <p>
                  Tu rutina la define tu prescripción médica, con estas lesiones:{" "}
                  <span className="text-ink">
                    {acceso.prescripcion.lesiones.map(nombreLesion).join(", ")}
                  </span>
                  .
                </p>
                <p>
                  <Link href="/prescripcion" className="text-teal-deep underline">
                    Ver o cambiar prescripción
                  </Link>
                </p>
              </div>
            ) : acceso.lesionesPaciente.length === 0 ? (
              <>
                <p className="mt-3 text-sm text-ink-soft">
                  No pudimos leer las lesiones de tu perfil. Elige la principal
                  de nuevo.
                </p>
                <FormLesion />
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-ink-soft">
                  Tu rutina muestra los ejercicios de tus lesiones activas.
                  Cuando te recuperes, marca la lesión como terminada; si
                  vuelve a molestarte, puedes reactivarla. Ante cualquier duda,
                  sigue la indicación de tu profesional.
                </p>
                <GestionLesiones lista={acceso.lesionesPaciente} />
                <p className="mt-6 text-sm text-ink-soft">
                  ¿Tienes una indicación médica?{" "}
                  <Link href="/prescripcion" className="text-teal-deep underline">
                    Sube tu prescripción
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Datos personales</h2>
            <FormNombre nombre={usuario.nombre} />
            <p className="mt-6 text-sm text-ink-soft">
              Correo: <span className="text-ink">{usuario.correo}</span>{" "}
              {usuario.correoVerificado ? "está confirmado." : "todavía no está confirmado."}
            </p>
            {!usuario.correoVerificado && <BotonReenviarCorreo />}
            <FormCorreo />
            <FormCambiarContrasena />
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Mis días de rutina</h2>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed">
              Marca los días en que tu profesional te indicó hacer tus
              ejercicios. Con ellos calculamos tu cumplimiento semanal y
              enviamos los recordatorios.
            </p>
            <FormDiasRutina inicial={dias} />
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Recordatorios</h2>
            {!usuario.correoVerificado && (
              <p className="mt-3 text-sm text-ink-soft">
                Confirma tu correo para activarlos.
              </p>
            )}
            <FormRecordatorios
              inicial={recordatorios?.modo ?? "apagado"}
              correoVerificado={usuario.correoVerificado}
            />
          </div>
          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Tus datos</h2>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed">
              Descarga una copia de todo lo que guardamos sobre ti: tu cuenta,
              tus lesiones, tu prescripción, tu historial y tus encuestas. También puedes
              eliminar tu cuenta y todos sus datos.
            </p>
            <a
              href="/api/cuenta/datos"
              download
              className="mt-4 inline-block text-sm font-medium border border-line text-ink px-4 py-2 rounded-sm hover:border-ink transition-colors"
            >
              Descargar mis datos
            </a>
            <div>
              <EliminarCuenta />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
