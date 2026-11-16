import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

/**
 * Registro de cada envío de recordatorio (RF11), en la colección
 * `envios_recordatorio`: uno por ejecución de la tarea que intentó escribirle
 * al paciente. No guarda el contenido del correo ni datos clínicos. Se borra
 * solo a los 180 días (índice TTL) y al eliminar la cuenta.
 */

export type EstadoEnvio = "enviado" | "fallido" | "agotado";

export type Envio = {
  fecha: string; // YYYY-MM-DD, hora de Chile
  hora: number; // hora de Chile en que corrió
  ronda: number; // ejecución del día (1 a MAX_INTENTOS_DIA)
  intentos: number; // intentos de envío dentro de la ejecución
  estado: EstadoEnvio;
  error?: string;
  creadoEn: Date;
};

const DIAS_GUARDADO = 180;
/** Reintentos inmediatos dentro de una misma ejecución, con estas esperas (ms). */
export const ESPERAS_REINTENTO = [1000, 3000];

let indices: Promise<unknown> | undefined;

async function coleccion(): Promise<Collection> {
  const c = (await getDb()).collection("envios_recordatorio");
  indices ??= Promise.all([
    c.createIndex({ usuarioId: 1, creadoEn: -1 }),
    c.createIndex({ creadoEn: 1 }, { expireAfterSeconds: DIAS_GUARDADO * 24 * 3600 }),
  ]).catch((err) => {
    indices = undefined;
    throw err;
  });
  await indices;
  return c;
}

/** Motivo del fallo, corto y sin direcciones de correo. */
export function describirError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  const partes = [e?.code, e?.responseCode, e?.message ?? String(err)].filter(Boolean).join(" ");
  return partes.replace(/[^\s@<>]+@[^\s@<>]+/g, "[correo]").slice(0, 160);
}

/**
 * Ejecuta `enviar` y, si falla, lo reintenta tras cada espera. Devuelve
 * cuántos intentos hizo y el último error, si ninguno resultó.
 */
export async function conReintentos(
  enviar: () => Promise<void>,
  esperas = ESPERAS_REINTENTO
): Promise<{ intentos: number; error?: unknown }> {
  let error: unknown;
  for (let i = 0; i <= esperas.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, esperas[i - 1]));
    try {
      await enviar();
      return { intentos: i + 1 };
    } catch (err) {
      error = err;
    }
  }
  return { intentos: esperas.length + 1, error };
}

export async function registrarEnvio(usuarioId: ObjectId, envio: Omit<Envio, "creadoEn">): Promise<void> {
  await (await coleccion()).insertOne({ usuarioId, ...envio, creadoEn: new Date() });
}

export async function ultimoEnvio(usuarioId: string): Promise<Envio | null> {
  const doc = await (await coleccion()).findOne(
    { usuarioId: new ObjectId(usuarioId) },
    { sort: { creadoEn: -1 }, projection: { _id: 0, usuarioId: 0 } }
  );
  return doc as Envio | null;
}

export async function enviosDe(usuarioId: string): Promise<Envio[]> {
  return (await (await coleccion())
    .find({ usuarioId: new ObjectId(usuarioId) }, { projection: { _id: 0, usuarioId: 0 } })
    .sort({ creadoEn: -1 })
    .toArray()) as unknown as Envio[];
}

/** Totales de los últimos `dias` días para el panel del administrador. */
export async function resumenEnvios(dias = 7, excluir: ObjectId[] = []) {
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000);
  const filas = await (await coleccion())
    .aggregate<{ _id: EstadoEnvio; total: number }>([
      { $match: { creadoEn: { $gte: desde }, ...(excluir.length ? { usuarioId: { $nin: excluir } } : {}) } },
      { $group: { _id: "$estado", total: { $sum: 1 } } },
    ])
    .toArray();
  const total = (estado: EstadoEnvio) => filas.find((f) => f._id === estado)?.total ?? 0;
  return { enviados: total("enviado"), fallidos: total("fallido"), agotados: total("agotado") };
}
