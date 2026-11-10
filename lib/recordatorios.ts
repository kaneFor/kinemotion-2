import crypto from "crypto";
import { leerEnv } from "@/lib/env";
import { diaDeLaSemana, diasDeRutina } from "@/lib/progreso";

/**
 * Reglas de los recordatorios, sin acceso a la base de datos.
 *  - "personalizado": en los días de rutina del paciente
 *  - "inactividad": todos los días
 * En ambos casos solo se envía si ese día no completó su rutina; eso lo
 * revisa la tarea diaria con el historial.
 */

export const MODOS_RECORDATORIO = ["apagado", "personalizado", "inactividad"] as const;
export type ModoRecordatorio = (typeof MODOS_RECORDATORIO)[number];

export type Recordatorios = {
  modo: ModoRecordatorio;
  /** Versión anterior: días elegidos solo para los recordatorios. */
  dias?: number[];
};

/** Fecha de hoy en Chile como YYYY-MM-DD, sin importar la zona del servidor. */
export const hoyEnChile = (ahora = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);

export function tocaRecordatorio(
  usuario: {
    recordatorios?: Recordatorios;
    diasRutina?: number[];
    ultimoRecordatorio?: string;
  },
  hoy: string
): boolean {
  const { recordatorios, ultimoRecordatorio } = usuario;
  if (!recordatorios || ultimoRecordatorio === hoy) {
    return false;
  }
  if (recordatorios.modo === "inactividad") return true;
  return (
    recordatorios.modo === "personalizado" &&
    diasDeRutina(usuario).includes(diaDeLaSemana(hoy))
  );
}

function firmar(usuarioId: string): string {
  const llave = leerEnv("ENCRYPTION_KEY");
  if (!llave) throw new Error("Falta la variable de entorno ENCRYPTION_KEY.");
  return crypto.createHmac("sha256", llave).update(`baja:${usuarioId}`).digest("hex");
}

/** Token del enlace de baja. No vence: darse de baja debe funcionar siempre. */
export const tokenBaja = (usuarioId: string) => `${usuarioId}.${firmar(usuarioId)}`;

export function usuarioDeTokenBaja(token: string): string | null {
  const [usuarioId, firma] = token.split(".");
  if (!usuarioId || !firma || !/^[0-9a-f]{24}$/.test(usuarioId)) return null;
  const esperada = Buffer.from(firmar(usuarioId));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida)
    ? usuarioId
    : null;
}
