import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { AvisoDemo, Pestanas } from "@/components/AdminUI";
import GraficoCumplimiento from "@/components/GraficoCumplimiento";
import { resumenEnvios } from "@/lib/envios";
import { calcularIndicadores, MINIMO_GRUPO, SEMANAS, type Promedio } from "@/lib/indicadores";
import { obtenerAdmin } from "@/lib/sesion";

/** Panel del administrador: indicadores agregados y anonimizados (RF16). */
export default async function Admin({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  // A quien no es administrador la página no le existe.
  if (!(await obtenerAdmin())) notFound();

  const incluirDemo = (await searchParams).demo !== "0";
  const [ind, envios] = await Promise.all([calcularIndicadores(incluirDemo), resumenEnvios(7)]);
  const sinDatos = `Menos de ${MINIMO_GRUPO} pacientes con sesiones`;
  const { actual } = ind;

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <Pestanas actual="indicadores" demo={incluirDemo} />
          <h1 className="mt-8 font-display text-3xl md:text-4xl text-ink">Indicadores</h1>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Totales y promedios de todos los pacientes, sin nombres. Un grupo con menos de{" "}
            {MINIMO_GRUPO} pacientes no se muestra, para que un promedio no permita reconocer a
            nadie.
          </p>

          <AvisoDemo demo={ind.demo} incluido={incluirDemo} ruta="/admin" />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-line pt-6">
            <Dato valor={String(ind.pacientes)} texto="pacientes con cuenta habilitada" />
            <Dato valor={String(ind.activosSemana)} texto="hicieron al menos un ejercicio esta semana" />
            <Dato valor={String(actual.suspendidas)} texto="días suspendidos por dolor esta semana" />
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Cumplimiento autodeclarado</h2>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              Sesiones completadas ÷ sesiones programadas de todos los pacientes, sin contar los días
              suspendidos por dolor. Es lo que declaran los pacientes, no una medición clínica.
            </p>
            <p className="mt-4">
              <span className="font-display text-4xl text-ink">
                {actual.porcentaje === null ? "—" : `${actual.porcentaje} %`}
              </span>{" "}
              <span className="text-sm text-ink-soft">
                esta semana
                {actual.porcentaje === null
                  ? ` · ${sinDatos.toLowerCase()}`
                  : ` · ${actual.completadas} de ${actual.programadas} sesiones de ${actual.pacientes} pacientes hasta hoy`}
              </span>
            </p>
            <GraficoCumplimiento semanas={ind.semanas} sinDatos={sinDatos} />
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Encuesta semanal</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Promedios de las últimas {SEMANAS} semanas, de 1 a 5. Los comentarios no se muestran
              porque pueden identificar a alguien.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Escala titulo="Utilidad percibida" p={ind.encuesta.utilidad} meta="Meta del proyecto: 4 o más" />
              <Escala titulo="Claridad de las instrucciones" p={ind.encuesta.claridad} />
              <Escala titulo="Dificultad" p={ind.encuesta.dificultad} />
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              {ind.encuesta.utilidad.respuestas} respuestas de {ind.encuesta.utilidad.pacientes} pacientes
              {ind.encuesta.omitidas > 0 && ` · ${ind.encuesta.omitidas} omitidas`}
            </p>
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Dolor declarado</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Promedio de las últimas {SEMANAS} semanas, de 0 (sin dolor) a 10.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Escala titulo="Antes de la rutina" p={ind.dolor.antes} max={10} />
              <Escala titulo="Después de la rutina" p={ind.dolor.despues} max={10} />
            </div>
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Ejercicios con cámara</h2>
            {ind.camara.pacientes < MINIMO_GRUPO ? (
              <p className="mt-3 text-sm text-ink-soft">
                Menos de {MINIMO_GRUPO} pacientes usaron la cámara en las últimas {SEMANAS} semanas.
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">
                <span className="font-display text-2xl text-ink">{ind.camara.reps}</span> repeticiones
                contadas por {ind.camara.pacientes} pacientes
                {ind.camara.revisadas > 0 &&
                  ` · ${Math.round((ind.camara.correctas / ind.camara.revisadas) * 100)} % con buena técnica (${ind.camara.correctas} de ${ind.camara.revisadas} revisadas)`}
                .
              </p>
            )}
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Recordatorios por correo</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Últimos 7 días. Cada envío queda registrado; si falla se reintenta, y tras 3 intentos
              fallidos en el día queda como agotado.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Dato valor={String(envios.enviados)} texto="enviados" />
              <Dato valor={String(envios.fallidos)} texto="fallidos que se reintentaron" />
              <Dato valor={String(envios.agotados)} texto="agotados (no se pudieron enviar ese día)" />
            </div>
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Por lesión</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Últimas {SEMANAS} semanas. Un paciente con dos lesiones cuenta en ambas.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-soft">
                  <tr>
                    <th className="py-2 pr-4 font-normal">Lesión</th>
                    <th className="py-2 pr-4 font-normal text-right">Pacientes</th>
                    <th className="py-2 pr-4 font-normal text-right">Cumplimiento</th>
                    <th className="py-2 font-normal text-right">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {ind.porLesion.map((l) => {
                    const pocos = l.pacientes < MINIMO_GRUPO;
                    return (
                      <tr key={l.slug} className="border-t border-line">
                        <td className="py-2 pr-4 text-ink">{l.nombre}</td>
                        <td className="py-2 pr-4 text-right text-ink">
                          {pocos ? <span className="text-ink-soft">menos de {MINIMO_GRUPO}</span> : l.pacientes}
                        </td>
                        <td className="py-2 pr-4 text-right text-ink">
                          {l.cumplimiento === null ? "—" : `${l.cumplimiento} %`}
                        </td>
                        <td className="py-2 text-right text-ink">
                          {l.utilidad === null ? "—" : `${l.utilidad.toLocaleString("es-CL")} / 5`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Dato({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div>
      <p className="font-display text-4xl text-ink">{valor}</p>
      <p className="mt-1 text-sm text-ink-soft">{texto}</p>
    </div>
  );
}

function Escala({ titulo, p, max = 5, meta }: { titulo: string; p: Promedio; max?: number; meta?: string }) {
  return (
    <div>
      <p className="text-sm text-ink-soft">{titulo}</p>
      <p className="mt-1">
        <span className="font-display text-3xl text-ink">
          {p.valor === null ? "—" : p.valor.toLocaleString("es-CL")}
        </span>
        {p.valor !== null && <span className="text-sm text-ink-soft"> / {max}</span>}
      </p>
      {p.valor === null ? (
        <p className="mt-1 text-xs text-ink-soft">Menos de {MINIMO_GRUPO} pacientes respondieron</p>
      ) : (
        meta && <p className="mt-1 text-xs text-ink-soft">{meta}</p>
      )}
    </div>
  );
}
