import crypto from "crypto";
import { leerEnv } from "@/lib/env";
import { diaDeLaSemana, diasDeRutina } from "@/lib/progreso";

/**
 * Reglas de los recordatorios, sin acceso a la base de datos.
 *  - "personalizado": en los días de rutina del paciente
 *  - "inactividad": todos los días
 * En ambos casos solo se envía si ese día no completó su rutina; eso lo
 * revisa la tarea horaria con el historial.
 *
 * El paciente elige la hora (RF11). La tarea corre cada hora, pero Vercel
 * puede ejecutarla en cualquier minuto de esa hora o saltarse una: por eso
 * se envía desde la hora elegida en adelante, si ese día aún no se envió,
 * hasta las 23:59.
 */

export const MODOS_RECORDATORIO = ["apagado", "personalizado", "inactividad"] as const;
export type ModoRecordatorio = (typeof MODOS_RECORDATORIO)[number];

/** Horas que puede elegir el paciente (hora de Chile). */
export const HORAS_RECORDATORIO = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 a 22:00
export const HORA_POR_DEFECTO = 19;
/** Intentos fallidos (ejecuciones de la tarea) por día antes de rendirse. */
export const MAX_INTENTOS_DIA = 3;

export type Recordatorios = {
  modo: ModoRecordatorio;
  /** Hora de Chile desde la que se envía, 7 a 22. */
  hora?: number;
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

/** Hora actual en Chile, de 0 a 23. */
export const horaEnChile = (ahora = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23" }).format(ahora)
  );

export const horaDe = (recordatorios?: Recordatorios) =>
  recordatorios?.hora !== undefined && HORAS_RECORDATORIO.includes(recordatorios.hora)
    ? recordatorios.hora
    : HORA_POR_DEFECTO;

export const formatoHora = (hora: number) => `${String(hora).padStart(2, "0")}:00`;

export type IntentosRecordatorio = { fecha: string; n: number };

export function tocaRecordatorio(
  usuario: {
    recordatorios?: Recordatorios;
    diasRutina?: number[];
    ultimoRecordatorio?: string;
    intentosRecordatorio?: IntentosRecordatorio;
  },
  hoy: string,
  horaActual: number
): boolean {
  const { recordatorios, ultimoRecordatorio, intentosRecordatorio } = usuario;
  if (!recordatorios || ultimoRecordatorio === hoy) {
    return false;
  }
  if (horaActual < horaDe(recordatorios)) return false;
  if (intentosRecordatorio?.fecha === hoy && intentosRecordatorio.n >= MAX_INTENTOS_DIA) {
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
