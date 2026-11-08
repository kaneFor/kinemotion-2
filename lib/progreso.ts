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
};

export type EventoProgreso =
  | { accion: "hecho" | "deshacer" | "saltar"; ejercicioId: string }
  | { accion: "reintentar" }
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
