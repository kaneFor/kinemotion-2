import { MongoServerError, ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { cifrar, descifrar, type CampoCifrado } from "@/lib/crypto";
import { diaVacio, type DiaProgreso } from "@/lib/progreso";

/**
 * Colección `historial_progreso`: un documento por paciente y por día.
 * Los ejercicios revelan la lesión y el dolor es un dato de salud, así que
 * todo el contenido va cifrado; solo el usuario y la fecha quedan legibles
 * para poder buscar.
 */

let indice: Promise<unknown> | undefined;

async function coleccion(): Promise<Collection> {
  const c = (await getDb()).collection("historial_progreso");
  indice ??= c.createIndex({ usuarioId: 1, fecha: 1 }, { unique: true }).catch((err) => {
    indice = undefined;
    throw err;
  });
  await indice;
  return c;
}

function leer(datos: unknown): DiaProgreso {
  if (!datos) return diaVacio();
  try {
    return { ...diaVacio(), ...JSON.parse(descifrar(datos as CampoCifrado)) };
  } catch (err) {
    console.warn(
      "No se pudo descifrar un día del historial (¿cambió ENCRYPTION_KEY?):",
      err instanceof Error ? err.message : err
    );
    return diaVacio();
  }
}

export async function leerDia(usuarioId: string, fecha: string): Promise<DiaProgreso> {
  const doc = await (await coleccion()).findOne({ usuarioId: new ObjectId(usuarioId), fecha });
  return leer(doc?.datos);
}

/** Días desde `desde` (incluido) hasta hoy. */
export async function leerDias(usuarioId: string, desde: string): Promise<Map<string, DiaProgreso>> {
  const docs = await (await coleccion())
    .find({ usuarioId: new ObjectId(usuarioId), fecha: { $gte: desde } })
    .toArray();
  return new Map(docs.map((d) => [d.fecha as string, leer(d.datos)]));
}

/**
 * Lee, cambia y guarda el día. Si otra petición lo guardó entremedio (dos
 * toques seguidos, por ejemplo), se vuelve a leer y se reintenta, para no
 * perder ninguno de los dos cambios.
 */
export async function modificarDia(
  usuarioId: string,
  fecha: string,
  cambiar: (dia: DiaProgreso) => DiaProgreso
): Promise<DiaProgreso> {
  const c = await coleccion();
  const filtro = { usuarioId: new ObjectId(usuarioId), fecha };

  for (let intento = 0; intento < 5; intento++) {
    const doc = await c.findOne(filtro);
    const nuevo = cambiar(leer(doc?.datos));
    const datos = cifrar(JSON.stringify(nuevo));

    if (doc) {
      const r = await c.updateOne(
        { _id: doc._id, version: doc.version },
        { $set: { datos, actualizadoEn: new Date() }, $inc: { version: 1 } }
      );
      if (r.matchedCount === 1) return nuevo;
    } else {
      try {
        await c.insertOne({ ...filtro, datos, version: 1, actualizadoEn: new Date() });
        return nuevo;
      } catch (err) {
        if (!(err instanceof MongoServerError && err.code === 11000)) throw err;
      }
    }
  }
  throw new Error("No se pudo guardar el historial: demasiados cambios al mismo tiempo.");
}
