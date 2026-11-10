import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { cifrar, descifrar, type CampoCifrado } from "@/lib/crypto";

/**
 * Encuesta semanal "¿Cómo sentiste los ejercicios?" (cuestionario de
 * utilidad percibida, escala 1 a 5, del plan de validación). Colección
 * `encuestas`: una por paciente y semana; las respuestas van cifradas
 * porque el comentario puede contener datos de salud.
 */

export type RespuestasEncuesta = {
  utilidad: number;
  claridad: number;
  dificultad: number;
  comentario?: string;
};

export type EncuestaGuardada =
  | ({ semana: string; omitida?: false } & RespuestasEncuesta)
  | { semana: string; omitida: true };

let indice: Promise<unknown> | undefined;

async function coleccion(): Promise<Collection> {
  const c = (await getDb()).collection("encuestas");
  indice ??= c.createIndex({ usuarioId: 1, semana: 1 }, { unique: true }).catch((err) => {
    indice = undefined;
    throw err;
  });
  await indice;
  return c;
}

function leer(doc: { semana: string; datos?: unknown }): EncuestaGuardada | null {
  try {
    const datos = JSON.parse(descifrar(doc.datos as CampoCifrado));
    return { semana: doc.semana, ...datos };
  } catch {
    return null;
  }
}

/** `semana` es el lunes de la semana (YYYY-MM-DD). Se puede responder de nuevo. */
export async function guardarEncuesta(
  usuarioId: string,
  semana: string,
  respuestas: RespuestasEncuesta | { omitida: true }
): Promise<void> {
  await (await coleccion()).updateOne(
    { usuarioId: new ObjectId(usuarioId), semana },
    { $set: { datos: cifrar(JSON.stringify(respuestas)), actualizadoEn: new Date() } },
    { upsert: true }
  );
}

/** Todas las encuestas del paciente, de la más reciente a la más antigua. */
export async function leerEncuestas(usuarioId: string): Promise<EncuestaGuardada[]> {
  const docs = await (await coleccion())
    .find({ usuarioId: new ObjectId(usuarioId) })
    .sort({ semana: -1 })
    .toArray();
  return docs
    .map((d) => leer(d as unknown as { semana: string; datos: unknown }))
    .filter((e): e is EncuestaGuardada => e !== null);
}
