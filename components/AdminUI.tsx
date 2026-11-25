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
    <p className="mt-4 text-xs text-ink-soft">
      {incluido ? (
        <>
          Incluye {demo} cuentas de demostración ·{" "}
          <Link href={`${ruta}?demo=0`} className="underline whitespace-nowrap">
            ver solo cuentas reales
          </Link>
        </>
      ) : (
        <>
          Solo cuentas reales ·{" "}
          <Link href={ruta} className="underline">
            incluir las {demo} de demostración
          </Link>
        </>
      )}
    </p>
  );
}
