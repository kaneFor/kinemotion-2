/**
 * Tipos compartidos de la supervisión con IA (Claude).
 *
 * El conteo de repeticiones en tiempo real se hace en el navegador (la
 * cámara corre a ~30 cuadros por segundo y una IA remota no puede responder
 * a esa velocidad). Al cerrar cada repetición, el navegador resume su
 * movimiento en números — nunca imágenes — y Claude decide si fue correcta,
 * explica por qué y da la indicación de voz.
 */

export type MetricasRep = {
  n: number; // número de repetición detectada (1, 2, 3…)
  duracionSeg: number;
  anguloMin: number;
  anguloMax: number;
  /** Ángulo de la articulación objetivo, muestreado cada ~100 ms, en grados. */
  serie: number[];
  /** Fracción (0–1) de cuadros en que se cumplió cada desviación postural. */
  desviaciones: Record<string, number>;
  /** Fracción de cuadros en que la persona no se vio bien. */
  sinVisibilidad: number;
};

export type SolicitudSupervision = {
  ejercicioId: string;
  modo: "repeticion" | "resumen";
  repeticiones: MetricasRep[];
};

export type VeredictoRep = {
  n: number;
  valida: boolean;
  motivo: string;
};

export type RespuestaSupervision = {
  repeticiones: VeredictoRep[];
  estado: "bien" | "corregir";
  mensaje: string;
  resumen: string;
};

export const MAX_REPS_POR_SOLICITUD = 30;
export const MAX_MUESTRAS_POR_REP = 120;
