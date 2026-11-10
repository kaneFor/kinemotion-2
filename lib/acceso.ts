import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { cifrar, descifrar, type CampoCifrado } from "@/lib/crypto";
import { lesiones, type Ejercicio } from "@/lib/data";
import {
  ejerciciosDeLesiones,
  ejerciciosDePrescripcion,
  lesionInicial,
  type LesionPaciente,
} from "@/lib/rutina";

/**
 * Qué ejercicios puede ver cada paciente:
 *  - si subió una prescripción médica → solo lo que indica la prescripción,
 *    para todas las lesiones que nombre
 *  - si no → los ejercicios de las lesiones activas de su cuenta, que él
 *    mismo puede agregar, terminar o reactivar
 */

export type PrescripcionGuardada = {
  archivo: string;
  subidaEn: string; // ISO
  lesiones: string[];
  ejercicios: string[]; // vacío = todos los de `lesiones`
};

export type Acceso = {
  origen: "prescripcion" | "lesion";
  lesionesPaciente: LesionPaciente[];
  prescripcion: PrescripcionGuardada | null;
  ejercicios: Ejercicio[];
};

/**
 * Descifra un campo del perfil. Si falla (típicamente porque se guardó con
 * otra ENCRYPTION_KEY), devuelve null en vez de botar la página: el
 * paciente vuelve a elegir su lesión y se guarda con la llave actual.
 */
export function leerCifrado(campo: unknown): string | null {
  if (!campo) return null;
  try {
    return descifrar(campo as CampoCifrado);
  } catch (err) {
    console.warn(
      "No se pudo descifrar un campo del perfil clínico (¿cambió ENCRYPTION_KEY?):",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

const esLesionConocida = (slug: string | null) =>
  lesiones.some((l) => l.slug === slug);

/** Las cuentas anteriores guardan una sola lesión en el campo `lesion`. */
export function leerLesiones(perfil: Record<string, unknown> | null): LesionPaciente[] {
  const guardadas = leerCifrado(perfil?.lesiones);
  if (guardadas) {
    return (JSON.parse(guardadas) as LesionPaciente[]).filter((l) =>
      esLesionConocida(l.slug)
    );
  }
  const anterior = leerCifrado(perfil?.lesion);
  if (!anterior || !esLesionConocida(anterior)) return [];
  const creadoEn = perfil?.creadoEn;
  return [
    lesionInicial(
      anterior,
      creadoEn instanceof Date ? creadoEn.toISOString() : undefined
    ),
  ];
}

export function cifrarLesiones(lista: LesionPaciente[]): CampoCifrado {
  return cifrar(JSON.stringify(lista));
}

export async function obtenerAcceso(usuarioId: string): Promise<Acceso> {
  const db = await getDb();
  const perfil = await db
    .collection("perfiles_clinicos")
    .findOne({ usuarioId: new ObjectId(usuarioId) });

  const lesionesPaciente = leerLesiones(perfil);
  const prescripcionCruda = leerCifrado(perfil?.prescripcion);
  const prescripcion: PrescripcionGuardada | null = prescripcionCruda
    ? JSON.parse(prescripcionCruda)
    : null;

  if (prescripcion) {
    return {
      origen: "prescripcion",
      lesionesPaciente,
      prescripcion,
      ejercicios: ejerciciosDePrescripcion(prescripcion),
    };
  }

  return {
    origen: "lesion",
    lesionesPaciente,
    prescripcion: null,
    ejercicios: ejerciciosDeLesiones(lesionesPaciente),
  };
}
