import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { descifrar, type CampoCifrado } from "@/lib/crypto";
import { ejercicios, ejerciciosPorLesion, lesiones, type Ejercicio } from "@/lib/data";

/**
 * Qué ejercicios puede ver cada paciente:
 *  - si subió una prescripción médica → solo lo que indica la prescripción
 *  - si no → los ejercicios de la lesión que eligió al crear su cuenta
 */

export type PrescripcionGuardada = {
  archivo: string;
  subidaEn: string; // ISO
  lesiones: string[];
  ejercicios: string[]; // vacío = todos los de `lesiones`
};

export type Acceso = {
  origen: "prescripcion" | "lesion";
  lesionRegistro: string | null;
  prescripcion: PrescripcionGuardada | null;
  ejercicios: Ejercicio[];
};

/**
 * Descifra un campo del perfil. Si falla (típicamente porque se guardó con
 * otra ENCRYPTION_KEY), devuelve null en vez de botar la página: el
 * paciente vuelve a elegir su lesión y se guarda con la llave actual.
 */
function leerCifrado(campo: unknown): string | null {
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

export async function obtenerAcceso(usuarioId: string): Promise<Acceso> {
  const db = await getDb();
  const perfil = await db
    .collection("perfiles_clinicos")
    .findOne({ usuarioId: new ObjectId(usuarioId) });

  const lesionCruda = leerCifrado(perfil?.lesion);
  const lesionRegistro =
    lesionCruda && lesiones.some((l) => l.slug === lesionCruda) ? lesionCruda : null;
  const prescripcionCruda = leerCifrado(perfil?.prescripcion);
  const prescripcion: PrescripcionGuardada | null = prescripcionCruda
    ? JSON.parse(prescripcionCruda)
    : null;

  if (prescripcion) {
    const permitidos =
      prescripcion.ejercicios.length > 0
        ? ejercicios.filter((e) => prescripcion.ejercicios.includes(e.id))
        : ejercicios.filter((e) => prescripcion.lesiones.includes(e.lesionSlug));
    return { origen: "prescripcion", lesionRegistro, prescripcion, ejercicios: permitidos };
  }

  return {
    origen: "lesion",
    lesionRegistro,
    prescripcion: null,
    ejercicios: lesionRegistro ? ejerciciosPorLesion(lesionRegistro) : [],
  };
}
