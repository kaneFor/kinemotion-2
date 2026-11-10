import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { AvisoDemo, Pestanas } from "@/components/AdminUI";
import BotonEstadoCuenta from "@/components/BotonEstadoCuenta";
import { getDb } from "@/lib/mongodb";
import { obtenerAdmin } from "@/lib/sesion";

const POR_PAGINA = 50;

const escaparRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Cuentas registradas (RF15): solo los datos de la cuenta. Las lesiones, el
 * historial y las encuestas están cifrados y el administrador no los ve.
 */
export default async function Cuentas({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; q?: string; pagina?: string }>;
}) {
  if (!(await obtenerAdmin())) notFound();

  const params = await searchParams;
  const incluirDemo = params.demo !== "0";
  const q = (params.q ?? "").trim().slice(0, 100);
  const pagina = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);

  const usuarios = (await getDb()).collection("usuarios");
  const base = { rol: { $ne: "admin" } };
  const filtro = {
    ...base,
    ...(incluirDemo ? {} : { demo: { $ne: true } }),
    ...(q
      ? {
          $or: [
            { nombre: { $regex: escaparRegex(q), $options: "i" } },
            { correo: { $regex: escaparRegex(q), $options: "i" } },
          ],
        }
      : {}),
  };
  const [total, demo, cuentas] = await Promise.all([
    usuarios.countDocuments(filtro),
    usuarios.countDocuments({ ...base, demo: true }),
    usuarios
      .find(filtro, {
        projection: { nombre: 1, correo: 1, creadoEn: 1, correoVerificadoEn: 1, deshabilitadaEn: 1, demo: 1 },
      })
      .sort({ creadoEn: -1 })
      .skip((pagina - 1) * POR_PAGINA)
      .limit(POR_PAGINA)
      .toArray(),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (n: number) => {
    const sp = new URLSearchParams();
    if (!incluirDemo) sp.set("demo", "0");
    if (q) sp.set("q", q);
    if (n > 1) sp.set("pagina", String(n));
    const s = sp.toString();
    return `/admin/cuentas${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <Pestanas actual="cuentas" demo={incluirDemo} />
          <h1 className="mt-8 font-display text-3xl md:text-4xl text-ink">Cuentas</h1>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Una cuenta deshabilitada no puede iniciar sesión ni recibe recordatorios; sus datos se
            conservan. Las lesiones, el progreso y las encuestas de cada paciente están cifrados y no
            se muestran aquí.
          </p>

          <AvisoDemo demo={demo} incluido={incluirDemo} ruta="/admin/cuentas" />

          <form className="mt-8 flex flex-wrap gap-3" action="/admin/cuentas">
            {!incluirDemo && <input type="hidden" name="demo" value="0" />}
            <label htmlFor="q" className="sr-only">
              Buscar por nombre o correo
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o correo"
              className="flex-1 min-w-0 border border-line bg-paper-dim/40 rounded-sm px-4 py-2 text-sm text-ink outline-none focus:border-teal"
            />
            <button type="submit" className="bg-ink text-paper px-4 py-2 rounded-sm text-sm hover:bg-teal-deep transition-colors">
              Buscar
            </button>
          </form>

          <p className="mt-6 text-xs text-ink-soft">
            {total} {total === 1 ? "cuenta" : "cuentas"}
            {q && ` que coinciden con «${q}»`}
          </p>

          {cuentas.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No hay cuentas que mostrar.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-soft">
                  <tr>
                    <th className="py-2 pr-4 font-normal">Nombre</th>
                    <th className="py-2 pr-4 font-normal">Correo</th>
                    <th className="py-2 pr-4 font-normal">Registro</th>
                    <th className="py-2 pr-4 font-normal">Correo confirmado</th>
                    <th className="py-2 pr-4 font-normal">Estado</th>
                    <th className="py-2 font-normal">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c._id.toString()} className="border-t border-line align-middle">
                      <td className="py-2 pr-4 text-ink">
                        {c.nombre}
                        {c.demo && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide border border-line rounded-sm px-1.5 py-0.5 text-ink-soft">
                            Demo
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft break-all">{c.correo}</td>
                      <td className="py-2 pr-4 text-ink-soft whitespace-nowrap">
                        {c.creadoEn instanceof Date
                          ? c.creadoEn.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft">{c.correoVerificadoEn ? "Sí" : "No"}</td>
                      <td className="py-2 pr-4">
                        {c.deshabilitadaEn ? (
                          <span className="text-danger">Deshabilitada</span>
                        ) : (
                          <span className="text-ink">Habilitada</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <BotonEstadoCuenta
                          id={c._id.toString()}
                          nombre={c.nombre}
                          deshabilitada={Boolean(c.deshabilitadaEn)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {paginas > 1 && (
            <nav className="mt-6 flex items-center gap-4 text-sm" aria-label="Páginas">
              {pagina > 1 && (
                <Link href={enlace(pagina - 1)} className="text-teal-deep underline">
                  ← Anteriores
                </Link>
              )}
              <span className="text-ink-soft">
                Página {pagina} de {paginas}
              </span>
              {pagina < paginas && (
                <Link href={enlace(pagina + 1)} className="text-teal-deep underline">
                  Siguientes →
                </Link>
              )}
            </nav>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
