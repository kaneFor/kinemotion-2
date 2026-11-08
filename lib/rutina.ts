import { ejercicios, lesiones, type Ejercicio } from "@/lib/data";

/**
 * Lesiones de un paciente y qué ejercicios le corresponden. Sin acceso a la
 * base de datos: lo guarda y lo lee `lib/acceso.ts`.
 *
 * Una lesión nunca se borra de la lista: al recuperarse queda "terminada" y
 * se puede reactivar. Por eso una lista vacía solo significa que no se pudo
 * leer el perfil.
 */

export type LesionPaciente = {
  slug: string;
  principal: boolean;
  estado: "activa" | "terminada";
  agregadaEn: string; // ISO
};

export const ACCIONES_LESION = ["agregar", "principal", "terminar", "reactivar"] as const;
export type AccionLesion = (typeof ACCIONES_LESION)[number];

export const lesionInicial = (slug: string, agregadaEn = new Date().toISOString()): LesionPaciente => ({
  slug,
  principal: true,
  estado: "activa",
  agregadaEn,
});

export const lesionesActivas = (lista: LesionPaciente[]) =>
  lista.filter((l) => l.estado === "activa");

/** Toda lista con lesiones activas queda con exactamente una principal. */
function conPrincipal(lista: LesionPaciente[]): LesionPaciente[] {
  const principal =
    lista.find((l) => l.principal && l.estado === "activa") ??
    lista.find((l) => l.estado === "activa");
  return lista.map((l) => ({ ...l, principal: l === principal }));
}

/** Aplica el cambio pedido, o devuelve el error para mostrar al paciente. */
export function cambiarLesiones(
  lista: LesionPaciente[],
  accion: AccionLesion,
  slug: string
): { lista: LesionPaciente[] } | { error: string } {
  const actual = lista.find((l) => l.slug === slug);

  if (accion === "agregar") {
    if (actual?.estado === "activa") return { error: "Esa lesión ya está en tu cuenta." };
    if (actual) return cambiarLesiones(lista, "reactivar", slug);
    return {
      lista: conPrincipal([
        ...lista,
        { ...lesionInicial(slug), principal: false },
      ]),
    };
  }

  if (!actual) return { error: "Esa lesión no está en tu cuenta." };

  const reemplazar = (cambios: Partial<LesionPaciente>) =>
    lista.map((l) => (l === actual ? { ...l, ...cambios } : l));

  switch (accion) {
    case "principal":
      if (actual.estado !== "activa") {
        return { error: "Reactiva la lesión antes de marcarla como principal." };
      }
      return {
        lista: lista.map((l) => ({ ...l, principal: l === actual })),
      };
    case "terminar":
      return { lista: conPrincipal(reemplazar({ estado: "terminada", principal: false })) };
    case "reactivar":
      return { lista: conPrincipal(reemplazar({ estado: "activa" })) };
  }
}

/** Ejercicios de las lesiones activas, con la principal primero. */
export function ejerciciosDeLesiones(lista: LesionPaciente[]): Ejercicio[] {
  const activas = lesionesActivas(lista).sort(
    (a, b) => Number(b.principal) - Number(a.principal)
  );
  return activas.flatMap((l) => ejercicios.filter((e) => e.lesionSlug === l.slug));
}

/**
 * Cada lesión de la prescripción se resuelve por separado: si el documento
 * nombra ejercicios de esa lesión, solo esos; si no, todos los de la lesión.
 */
export function ejerciciosDePrescripcion(p: {
  lesiones: string[];
  ejercicios: string[];
}): Ejercicio[] {
  const lesionesConIndicados = new Set(
    ejercicios.filter((e) => p.ejercicios.includes(e.id)).map((e) => e.lesionSlug)
  );
  return ejercicios.filter(
    (e) =>
      p.ejercicios.includes(e.id) ||
      (p.lesiones.includes(e.lesionSlug) && !lesionesConIndicados.has(e.lesionSlug))
  );
}

export const nombreLesion = (slug: string | null | undefined) =>
  lesiones.find((l) => l.slug === slug)?.nombre ?? "Lesión no reconocida";
