import Link from "next/link";

/** Piezas compartidas por las páginas de /admin. */

export function Pestanas({ actual, demo }: { actual: "indicadores" | "cuentas"; demo: boolean }) {
  const q = demo ? "" : "?demo=0";
  const clase = (activa: boolean) =>
    "pb-2 border-b-2 " +
    (activa ? "border-teal text-ink" : "border-transparent text-ink-soft hover:text-ink");
  return (
    <nav className="flex gap-6 text-sm" aria-label="Administración">
      <Link href={`/admin${q}`} className={clase(actual === "indicadores")} aria-current={actual === "indicadores" ? "page" : undefined}>
        Indicadores
      </Link>
      <Link href={`/admin/cuentas${q}`} className={clase(actual === "cuentas")} aria-current={actual === "cuentas" ? "page" : undefined}>
        Cuentas
      </Link>
    </nav>
  );
}

export function AvisoDemo({ demo, incluido, ruta }: { demo: number; incluido: boolean; ruta: string }) {
  if (demo === 0) return null;
  return (
    <div className="mt-6 border border-line bg-paper-dim/60 rounded-sm px-4 py-3 text-sm">
      {incluido ? (
        <>
          <strong className="text-ink">Incluye {demo} cuentas de demostración.</strong>{" "}
          <span className="text-ink-soft">
            Son datos inventados para mostrar el panel; no son resultados de la validación.
          </span>{" "}
          <Link href={`${ruta}?demo=0`} className="text-teal-deep underline whitespace-nowrap">
            Ver solo cuentas reales
          </Link>
        </>
      ) : (
        <>
          <span className="text-ink-soft">Mostrando solo cuentas reales.</span>{" "}
          <Link href={ruta} className="text-teal-deep underline">
            Incluir las {demo} cuentas de demostración
          </Link>
        </>
      )}
    </div>
  );
}
