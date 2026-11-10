/**
 * Historial de la rutina: un registro por paciente y por día (hora de
 * Chile). Sin acceso a la base de datos: lo guarda `lib/historial.ts`.
 */

export type SerieCamara = {
  ejercicioId: string;
  reps: number;
  correctas?: number;
  revisadas?: number;
  en: string; // ISO
};

export type DiaProgreso = {
  hechos: { ejercicioId: string; en: string }[];
  saltados: string[];
  series: SerieCamara[];
  dolorAntes?: number;
  dolorDespues?: number;
  /** Ejercicios que tenía la rutina ese día, para saber si la completó. */
  totalRutina?: number;
  /** Rutina suspendida por dolor: no cuenta como sesión programada. */
  suspendido?: boolean;
};

export type EventoProgreso =
  | { accion: "hecho" | "deshacer" | "saltar"; ejercicioId: string }
  | { accion: "reintentar" | "suspender" | "reanudar" }
  | { accion: "dolor"; momento: "antes" | "despues"; valor: number }
  | {
      accion: "serie";
      ejercicioId: string;
      reps: number;
      correctas?: number;
      revisadas?: number;
    };

const MAX_SERIES_POR_DIA = 100;

export const diaVacio = (): DiaProgreso => ({ hechos: [], saltados: [], series: [] });

export function aplicarEvento(
  dia: DiaProgreso,
  evento: EventoProgreso,
  ahora = new Date().toISOString()
): DiaProgreso {
  switch (evento.accion) {
    case "hecho":
      return {
        ...dia,
        hechos: dia.hechos.some((h) => h.ejercicioId === evento.ejercicioId)
          ? dia.hechos
          : [...dia.hechos, { ejercicioId: evento.ejercicioId, en: ahora }],
        saltados: dia.saltados.filter((id) => id !== evento.ejercicioId),
      };
    case "deshacer":
      return { ...dia, hechos: dia.hechos.filter((h) => h.ejercicioId !== evento.ejercicioId) };
    case "saltar":
      if (
        dia.saltados.includes(evento.ejercicioId) ||
        dia.hechos.some((h) => h.ejercicioId === evento.ejercicioId)
      ) {
        return dia;
      }
      return { ...dia, saltados: [...dia.saltados, evento.ejercicioId] };
    case "reintentar":
      return { ...dia, saltados: [] };
    case "suspender":
      return { ...dia, suspendido: true };
    case "reanudar":
      return { ...dia, suspendido: false };
    case "dolor":
      return evento.momento === "antes"
        ? { ...dia, dolorAntes: evento.valor }
        : { ...dia, dolorDespues: evento.valor };
    case "serie": {
      const { ejercicioId, reps, correctas, revisadas } = evento;
      const serie: SerieCamara = { ejercicioId, reps, correctas, revisadas, en: ahora };
      return { ...dia, series: [...dia.series, serie].slice(-MAX_SERIES_POR_DIA) };
    }
  }
}

/** Avance de hoy sobre la rutina actual, en el orden en que se muestra. */
export function estadoRutina(rutina: string[], dia: DiaProgreso) {
  const hechos = rutina.filter((id) => dia.hechos.some((h) => h.ejercicioId === id));
  const pendientes = rutina.filter((id) => !hechos.includes(id));
  return {
    hechos,
    pendientes,
    saltados: pendientes.filter((id) => dia.saltados.includes(id)),
    siguiente: pendientes.find((id) => !dia.saltados.includes(id)) ?? null,
    completa: rutina.length > 0 && pendientes.length === 0,
  };
}

/**
 * Sugerir parar si el dolor queda alto o sube mucho durante la rutina.
 * Umbrales PROVISORIOS: deben ser validados por el kinesiólogo revisor.
 */
export const DOLOR_ALTO = 7;
export const ALZA_DE_DOLOR = 3;

export function dolorPreocupante(antes?: number, despues?: number): boolean {
  if (despues === undefined) return false;
  return despues >= DOLOR_ALTO || (antes !== undefined && despues - antes >= ALZA_DE_DOLOR);
}

/** Suma días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const hizoAlgo = (dia: DiaProgreso | undefined) => Boolean(dia && dia.hechos.length > 0);

export const completoRutina = (dia: DiaProgreso | undefined) =>
  Boolean(dia?.totalRutina && dia.hechos.length >= dia.totalRutina);

/**
 * Días seguidos con al menos un ejercicio hecho. Si hoy todavía no hizo
 * nada, la racha sigue viva y se cuenta desde ayer.
 */
export function racha(dias: Map<string, DiaProgreso>, hoy: string): number {
  let fecha = hizoAlgo(dias.get(hoy)) ? hoy : sumarDias(hoy, -1);
  let total = 0;
  while (hizoAlgo(dias.get(fecha))) {
    total++;
    fecha = sumarDias(fecha, -1);
  }
  return total;
}

export const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

export const DIAS_SEMANA = [
  { valor: 1, nombre: "Lun" },
  { valor: 2, nombre: "Mar" },
  { valor: 3, nombre: "Mié" },
  { valor: 4, nombre: "Jue" },
  { valor: 5, nombre: "Vie" },
  { valor: 6, nombre: "Sáb" },
  { valor: 0, nombre: "Dom" },
];

/**
 * Días de la semana en que el paciente debe hacer su rutina (0 = domingo).
 * Antes se elegían solo para los recordatorios, por eso se usan esos si
 * todavía no definió sus días de rutina.
 */
export function diasDeRutina(usuario: {
  diasRutina?: number[];
  recordatorios?: { modo?: string; dias?: number[] };
}): number[] {
  if (usuario.diasRutina?.length) return usuario.diasRutina;
  if (usuario.recordatorios?.modo === "personalizado" && usuario.recordatorios.dias?.length) {
    return usuario.recordatorios.dias;
  }
  return TODOS_LOS_DIAS;
}

export const diaDeLaSemana = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

/** Lunes de la semana de una fecha. */
export const lunesDe = (fecha: string) => sumarDias(fecha, -((diaDeLaSemana(fecha) + 6) % 7));

export type CumplimientoSemana = {
  lunes: string;
  programadas: number;
  completadas: number;
  suspendidas: number;
  /** null si la semana no tiene sesiones programadas. */
  porcentaje: number | null;
};

/**
 * Cumplimiento autodeclarado de una semana, como lo define el proyecto:
 * sesiones completadas ÷ sesiones programadas × 100, sin contar en el
 * denominador las sesiones suspendidas por dolor. Una sesión completada es
 * un día con la rutina completa; cuenta aunque no fuera un día programado,
 * hasta llegar al total programado. Solo se consideran los días entre
 * `desde` (creación de la cuenta) y `hoy`.
 */
export function cumplimientoSemana(
  dias: Map<string, DiaProgreso>,
  diasRutina: number[],
  lunes: string,
  hoy: string,
  desde = "0000-01-01"
): CumplimientoSemana {
  let programadas = 0;
  let suspendidas = 0;
  let completadas = 0;
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(lunes, i);
    if (fecha > hoy || fecha < desde) continue;
    const dia = dias.get(fecha);
    if (diasRutina.includes(diaDeLaSemana(fecha))) {
      if (dia?.suspendido) suspendidas++;
      else programadas++;
    }
    if (!dia?.suspendido && completoRutina(dia)) completadas++;
  }
  completadas = Math.min(completadas, programadas);
  return {
    lunes,
    programadas,
    completadas,
    suspendidas,
    porcentaje: programadas > 0 ? Math.round((completadas / programadas) * 100) : null,
  };
}
