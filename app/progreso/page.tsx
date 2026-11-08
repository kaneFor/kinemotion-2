import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import GraficoDolor, { type PuntoDolor } from "@/components/GraficoDolor";
import { ejercicios } from "@/lib/data";
import { leerDias } from "@/lib/historial";
import { completoRutina, hizoAlgo, racha, sumarDias, type DiaProgreso } from "@/lib/progreso";
import { hoyEnChile } from "@/lib/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function Progreso() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  const hoy = hoyEnChile();
  const dias = await leerDias(usuario.id, sumarDias(hoy, -89));
  const diasSeguidos = racha(dias, hoy);

  const mes = hoy.slice(0, 7);
  const delMes = [...dias].filter(([fecha]) => fecha.startsWith(mes)).map(([, d]) => d);
  const diasActivos = delMes.filter(hizoAlgo).length;
  const completas = delMes.filter(completoRutina).length;

  const ultimos30 = Array.from({ length: 30 }, (_, i) => sumarDias(hoy, i - 29));
  const puntos: PuntoDolor[] = ultimos30.map((fecha) => ({
    fecha,
    antes: dias.get(fecha)?.dolorAntes,
    despues: dias.get(fecha)?.dolorDespues,
  }));

  const conteo = new Map<string, { veces: number; reps: number; correctas: number; revisadas: number }>();
  for (const fecha of ultimos30) {
    const d = dias.get(fecha);
    if (!d) continue;
    const de = (id: string) => {
      if (!conteo.has(id)) conteo.set(id, { veces: 0, reps: 0, correctas: 0, revisadas: 0 });
      return conteo.get(id)!;
    };
    for (const h of d.hechos) de(h.ejercicioId).veces++;
    for (const s of d.series) {
      const c = de(s.ejercicioId);
      c.reps += s.reps;
      c.correctas += s.correctas ?? 0;
      c.revisadas += s.revisadas ?? 0;
    }
  }
  const filas = [...conteo]
    .map(([id, c]) => ({ id, nombre: ejercicios.find((e) => e.id === id)?.nombre ?? id, ...c }))
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre));

  const sinNada = dias.size === 0 || ![...dias.values()].some((d) => hizoAlgo(d) || d.series.length);

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="font-display text-3xl md:text-4xl text-ink">Mi progreso</h1>
          <p className="mt-3 text-sm text-ink-soft">
            Tu historial se guarda cifrado y solo lo ves tú.{" "}
            <Link href="/sesion" className="text-teal-deep underline">
              Ir a la rutina de hoy
            </Link>
          </p>

          {sinNada && (
            <p className="mt-8 text-ink-soft">
              Aún no hay ejercicios registrados. Cuando completes tu primer
              ejercicio en la{" "}
              <Link href="/sesion" className="text-teal-deep underline">
                rutina de hoy
              </Link>
              , tu avance aparecerá aquí.
            </p>
          )}

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-line pt-6">
            <Dato valor={diasSeguidos} texto={diasSeguidos === 1 ? "día seguido ejercitándote" : "días seguidos ejercitándote"} />
            <Dato valor={diasActivos} texto="días con ejercicios este mes" />
            <Dato valor={completas} texto={completas === 1 ? "rutina completa este mes" : "rutinas completas este mes"} />
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Este mes</h2>
            <Calendario hoy={hoy} dias={dias} />
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Dolor en los últimos 30 días</h2>
            <p className="mt-1 text-xs text-ink-soft">De 0 (sin dolor) a 10 (máximo).</p>
            <GraficoDolor puntos={puntos} />
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <h2 className="font-display text-base text-ink">Ejercicios de los últimos 30 días</h2>
            {filas.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Todavía no hay ejercicios registrados.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-ink-soft">
                    <tr>
                      <th className="py-2 pr-4 font-normal">Ejercicio</th>
                      <th className="py-2 pr-4 font-normal text-right">Días hecho</th>
                      <th className="py-2 font-normal text-right">Repeticiones con cámara</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.id} className="border-t border-line">
                        <td className="py-2 pr-4 text-ink">{f.nombre}</td>
                        <td className="py-2 pr-4 text-right text-ink">{f.veces}</td>
                        <td className="py-2 text-right text-ink">
                          {f.reps > 0 ? f.reps : "—"}
                          {f.revisadas > 0 && (
                            <span className="block text-xs text-ink-soft">
                              {f.correctas} correctas de {f.revisadas} revisadas
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Dato({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div>
      <p className="font-display text-4xl text-ink">{valor}</p>
      <p className="mt-1 text-sm text-ink-soft">{texto}</p>
    </div>
  );
}

function Calendario({ hoy, dias }: { hoy: string; dias: Map<string, DiaProgreso> }) {
  const primero = `${hoy.slice(0, 7)}-01`;
  const desfase = (new Date(`${primero}T12:00:00Z`).getUTCDay() + 6) % 7;
  const largo = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)), 0)).getUTCDate();
  const nombreMes = new Date(`${primero}T12:00:00Z`).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mt-3 max-w-sm">
      <p className="text-sm text-ink-soft first-letter:uppercase">{nombreMes}</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="text-ink-soft py-1">
            {d}
          </span>
        ))}
        {Array.from({ length: desfase }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: largo }, (_, i) => {
          const fecha = sumarDias(primero, i);
          const d = dias.get(fecha);
          const estado = fecha > hoy ? "futuro" : completoRutina(d) ? "completa" : hizoAlgo(d) ? "parcial" : "nada";
          const texto = {
            completa: "rutina completa",
            parcial: "algunos ejercicios",
            nada: "sin ejercicios",
            futuro: "",
          }[estado];
          return (
            <span
              key={fecha}
              title={texto}
              aria-label={`${i + 1}${texto ? `: ${texto}` : ""}`}
              className={
                "aspect-square flex items-center justify-center rounded-sm " +
                (estado === "completa"
                  ? "bg-teal text-paper font-medium"
                  : estado === "parcial"
                  ? "border-2 border-teal text-ink"
                  : estado === "futuro"
                  ? "text-ink-soft/50"
                  : "border border-line text-ink-soft") +
                (fecha === hoy ? " underline underline-offset-2" : "")
              }
            >
              {i + 1}
            </span>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm bg-teal" aria-hidden /> Rutina completa
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm border-2 border-teal" aria-hidden /> Algunos ejercicios
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm border border-line" aria-hidden /> Sin ejercicios
        </li>
      </ul>
    </div>
  );
}
