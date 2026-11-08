import crypto from "crypto";
import { leerEnv } from "@/lib/env";

/**
 * Reglas de los recordatorios, sin acceso a la base de datos.
 *  - "personalizado": en los días de la semana que eligió el paciente
 *  - "inactividad": todos los días
 * En ambos casos solo se envía si ese día no completó su rutina; eso lo
 * revisa la tarea diaria con el historial.
 */

export const MODOS_RECORDATORIO = ["apagado", "personalizado", "inactividad"] as const;
export type ModoRecordatorio = (typeof MODOS_RECORDATORIO)[number];

export type Recordatorios = {
  modo: ModoRecordatorio;
  dias: number[]; // 0 = domingo … 6 = sábado
};

export const DIAS_SEMANA = [
  { valor: 1, nombre: "Lun" },
  { valor: 2, nombre: "Mar" },
  { valor: 3, nombre: "Mié" },
  { valor: 4, nombre: "Jue" },
  { valor: 5, nombre: "Vie" },
  { valor: 6, nombre: "Sáb" },
  { valor: 0, nombre: "Dom" },
];

/** Fecha de hoy en Chile como YYYY-MM-DD, sin importar la zona del servidor. */
export const hoyEnChile = (ahora = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);

const diaDeLaSemana = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

export function tocaRecordatorio(
  usuario: {
    recordatorios?: Recordatorios;
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
    recordatorios.dias.includes(diaDeLaSemana(hoy))
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
