import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ExerciseCard from "@/components/ExerciseCard";
import { AccionesEjercicio, BotonReintentar, PreguntaDolor } from "@/components/AccionesSesion";
import { obtenerAcceso } from "@/lib/acceso";
import { leerDia } from "@/lib/historial";
import { dolorPreocupante, estadoRutina } from "@/lib/progreso";
import { hoyEnChile } from "@/lib/recordatorios";
import { nombreLesion } from "@/lib/rutina";
import { obtenerUsuario } from "@/lib/sesion";

/**
 * Recorrido guiado por la rutina de hoy: muestra el primer ejercicio
 * pendiente y, al terminarlo, pasa al siguiente.
 */
export default async function Sesion({
  searchParams,
}: {
  searchParams: Promise<{ sinDolor?: string; fin?: string }>;
}) {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  const { sinDolor, fin } = await searchParams;
  const { ejercicios } = await obtenerAcceso(usuario.id);
  const rutina = ejercicios.map((e) => e.id);
  const dia = await leerDia(usuario.id, hoyEnChile());
  const estado = estadoRutina(rutina, dia);
  const actual = ejercicios.find((e) => e.id === estado.siguiente);

  const preguntarAntes =
    actual && estado.hechos.length === 0 && dia.dolorAntes === undefined && !sinDolor;
  const preguntarDespues = !actual && rutina.length > 0 && dia.dolorDespues === undefined && !fin;

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 md:px-10 pt-14 pb-20">
          <Link href="/biblioteca" className="text-sm text-ink-soft hover:text-ink">
            ← Volver a mi rutina
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-ink mt-4">Rutina de hoy</h1>

          {rutina.length === 0 ? (
            <p className="mt-6 text-ink-soft">
              No tienes ejercicios asignados. Agrega o reactiva una lesión en{" "}
              <Link href="/cuenta" className="text-teal-deep underline">
                Mi cuenta
              </Link>
              .
            </p>
          ) : (
            <>
              <div className="mt-4" aria-label="Avance de hoy">
                <p className="text-sm text-ink-soft">
                  {estado.hechos.length} de {rutina.length} ejercicios hechos
                </p>
                <div className="mt-2 h-1.5 bg-paper-dim rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal rounded-full"
                    style={{ width: `${(estado.hechos.length / rutina.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-10">
                {preguntarAntes ? (
                  <PreguntaDolor momento="antes" omitir="/sesion?sinDolor=1" />
                ) : actual ? (
                  <>
                    <p className="label-tech text-xs text-teal-deep">
                      Ejercicio {rutina.indexOf(actual.id) + 1} de {rutina.length} ·{" "}
                      {nombreLesion(actual.lesionSlug)}
                    </p>
                    <div className="mt-3 max-w-md">
                      <ExerciseCard ejercicio={actual} desdeSesion />
                    </div>
                    <AccionesEjercicio ejercicioId={actual.id} />
                  </>
                ) : preguntarDespues ? (
                  <PreguntaDolor momento="despues" omitir="/sesion?fin=1" />
                ) : (
                  <Resumen
                    completa={estado.completa}
                    hechos={estado.hechos.length}
                    total={rutina.length}
                    saltados={estado.saltados.length}
                    alerta={dolorPreocupante(dia.dolorAntes, dia.dolorDespues)}
                  />
                )}
              </div>

              <div className="mt-12 border-t border-line pt-6">
                <h2 className="font-display text-base text-ink">Tu lista de hoy</h2>
                <ol className="mt-3 space-y-1.5 text-sm">
                  {ejercicios.map((e) => {
                    const hecho = estado.hechos.includes(e.id);
                    const saltado = estado.saltados.includes(e.id);
                    return (
                      <li key={e.id} className="flex gap-3">
                        <span
                          className={
                            "w-20 shrink-0 text-xs label-tech " +
                            (hecho ? "text-teal-deep" : "text-ink-soft")
                          }
                        >
                          {hecho ? "✓ Hecho" : saltado ? "Saltado" : e.id === actual?.id ? "Ahora" : "Pendiente"}
                        </span>
                        <span className={hecho ? "text-ink-soft" : "text-ink"}>{e.nombre}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Resumen({
  completa,
  hechos,
  total,
  saltados,
  alerta,
}: {
  completa: boolean;
  hechos: number;
  total: number;
  saltados: number;
  alerta: boolean;
}) {
  return (
    <div>
      <h2 className="font-display text-xl text-ink">
        {completa ? "✓ Rutina de hoy completa" : `Hiciste ${hechos} de ${total} ejercicios`}
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        {completa
          ? "Buen trabajo. Cada día cuenta para tu recuperación."
          : saltados === 1
          ? "Saltaste 1 ejercicio. Puedes intentarlo ahora o dejarlo para mañana."
          : `Saltaste ${saltados} ejercicios. Puedes intentarlos ahora o dejarlos para mañana.`}
      </p>
      {alerta && (
        <p role="alert" className="mt-4 text-sm text-danger border border-danger/40 rounded-sm px-3 py-2">
          Tu dolor quedó alto o subió bastante durante la rutina. Descansa y, si
          no mejora, consulta a tu kinesiólogo o médico antes de seguir con los
          ejercicios.
        </p>
      )}
      {saltados > 0 && <BotonReintentar cantidad={saltados} />}
      <p className="mt-6 text-sm">
        <Link href="/progreso" className="text-teal-deep underline">
          Ver mi progreso
        </Link>
      </p>
    </div>
  );
}
