export type Lesion = {
  slug: string;
  nombre: string;
  descripcion: string;
  fase: string[];
};

export type AngleTarget = {
  /**
   * Qué se mide. "elevacion" no es un ángulo: es cuánto sube el cuerpo
   * (hombros y caderas), en % del largo del tronco. Ver `lib/elevacion.ts`.
   */
  joint: "rodilla" | "tobillo" | "codo" | "elevacion";
  /**
   * Si es true, min y max son grados POR SOBRE la postura inicial del
   * paciente (se calibra al empezar, quieto). Sirve para movimientos de
   * pocos grados cuyo ángulo absoluto cambia mucho entre personas y según
   * la cámara, como la elevación de talones.
   */
  relativo?: boolean;
  min: number;
  max: number;
  descripcion: string;
};

export type Ejercicio = {
  id: string;
  lesionSlug: string;
  nombre: string;
  series: string;
  ritmo: string;
  foco: string;
  angleTarget?: AngleTarget;
  media?: string; // ruta del video en /public, p. ej. "/ejercicios/et-03.mp4"
};

export const lesiones: Lesion[] = [
  {
    slug: "esguince-tobillo",
    nombre: "Esguince de tobillo grado 1",
    descripcion:
      "Recupera el rango articular y la propiocepción sin sobrecargar el ligamento en fase de cicatrización.",
    fase: ["Movilidad temprana", "Carga progresiva", "Estabilidad y equilibrio"],
  },
  {
    slug: "fascitis-plantar",
    nombre: "Fascitis plantar",
    descripcion:
      "Libera la tensión de la fascia y fortalece la musculatura intrínseca del pie para reducir el dolor matinal.",
    fase: ["Liberación miofascial", "Fortalecimiento", "Retorno a la marcha"],
  },
  {
    slug: "tendinitis-muneca",
    nombre: "Tendinitis de muñeca",
    descripcion:
      "Descarga el tendón sobrecargado por uso de teclado o celular y restaura el control de agarre.",
    fase: ["Reposo activo", "Deslizamiento tendinoso", "Fuerza funcional"],
  },
  {
    slug: "epicondilitis",
    nombre: "Epicondilitis lateral",
    descripcion:
      "Trabaja el codo de tenista con ejercicios excéntricos que remodelan el tendón de forma segura.",
    fase: ["Isométricos", "Excéntricos", "Retorno a la carga"],
  },
  {
    slug: "cervicalgia",
    nombre: "Cervicalgia tensional",
    descripcion:
      "Corrige la postura de teleestudio y libera la tensión acumulada en trapecio y cuello.",
    fase: ["Movilidad cervical", "Control postural", "Fuerza cervical profunda"],
  },
];

export const ejercicios: Ejercicio[] = [
  { id: "et-01", lesionSlug: "esguince-tobillo", nombre: "Círculos de tobillo", series: "3 x 10 por lado", ritmo: "Lento y controlado", foco: "Rango articular" },
  { id: "et-02", lesionSlug: "esguince-tobillo", nombre: "Alfabeto con el pie", series: "1 x abecedario", ritmo: "Continuo", foco: "Movilidad" },
  { id: "et-03", lesionSlug: "esguince-tobillo", nombre: "Elevación de talones", series: "3 x 12", ritmo: "2s subida, 2s bajada", foco: "Fuerza gemelo", angleTarget: { joint: "elevacion", relativo: true, min: 6, max: 60, descripcion: "Cuánto sube tu cuerpo al ponerte en puntas" }, media: "/ejercicios/et-03.mp4" },
  { id: "et-04", lesionSlug: "esguince-tobillo", nombre: "Equilibrio monopodal", series: "3 x 30s", ritmo: "Estático", foco: "Propiocepción" },
  { id: "et-05", lesionSlug: "esguince-tobillo", nombre: "Banda elástica en inversión", series: "3 x 15", ritmo: "Controlado", foco: "Estabilidad lateral" },
  { id: "et-06", lesionSlug: "esguince-tobillo", nombre: "Sentadilla en step", series: "3 x 10", ritmo: "Moderado", foco: "Carga funcional", angleTarget: { joint: "rodilla", min: 70, max: 100, descripcion: "Flexión de rodilla dentro de rango seguro" } },
  { id: "fp-01", lesionSlug: "fascitis-plantar", nombre: "Rodillo plantar con pelota", series: "2 x 2 min", ritmo: "Lento", foco: "Liberación fascial" },
  { id: "fp-02", lesionSlug: "fascitis-plantar", nombre: "Estiramiento de fascia con toalla", series: "3 x 30s", ritmo: "Estático", foco: "Elongación" },
  { id: "fp-03", lesionSlug: "fascitis-plantar", nombre: "Toma de canicas con los dedos", series: "2 x 15", ritmo: "Controlado", foco: "Musculatura intrínseca" },
  { id: "fp-04", lesionSlug: "fascitis-plantar", nombre: "Elevación de talón en escalón", series: "3 x 12", ritmo: "3s excéntrico", foco: "Fuerza fascia" },
  { id: "fp-05", lesionSlug: "fascitis-plantar", nombre: "Estiramiento gemelo en pared", series: "3 x 30s", ritmo: "Estático", foco: "Cadena posterior" },
  { id: "fp-06", lesionSlug: "fascitis-plantar", nombre: "Marcha en punta y talón", series: "3 x 10 m", ritmo: "Moderado", foco: "Retorno funcional" },
  { id: "tm-01", lesionSlug: "tendinitis-muneca", nombre: "Deslizamiento de tendones", series: "2 x 10", ritmo: "Lento", foco: "Movilidad tendinosa" },
  { id: "tm-02", lesionSlug: "tendinitis-muneca", nombre: "Flexo-extensión de muñeca", series: "3 x 12", ritmo: "Controlado", foco: "Rango articular" },
  { id: "tm-03", lesionSlug: "tendinitis-muneca", nombre: "Isométrico de agarre", series: "3 x 20s", ritmo: "Estático", foco: "Fuerza de agarre" },
  { id: "tm-04", lesionSlug: "tendinitis-muneca", nombre: "Pronosupinación con peso ligero", series: "3 x 10", ritmo: "Lento", foco: "Control rotacional" },
  { id: "tm-05", lesionSlug: "tendinitis-muneca", nombre: "Estiramiento de flexores", series: "3 x 30s", ritmo: "Estático", foco: "Elongación" },
  { id: "tm-06", lesionSlug: "tendinitis-muneca", nombre: "Extensión con banda elástica", series: "3 x 15", ritmo: "Moderado", foco: "Fuerza extensora" },
  { id: "ep-01", lesionSlug: "epicondilitis", nombre: "Isométrico de extensores", series: "4 x 20s", ritmo: "Estático", foco: "Descarga tendinosa" },
  { id: "ep-02", lesionSlug: "epicondilitis", nombre: "Excéntrico de muñeca con mancuerna", series: "3 x 12", ritmo: "4s bajada", foco: "Remodelación tendinosa" },
  { id: "ep-03", lesionSlug: "epicondilitis", nombre: "Estiramiento de epicóndilo", series: "3 x 30s", ritmo: "Estático", foco: "Elongación" },
  { id: "ep-04", lesionSlug: "epicondilitis", nombre: "Pronosupinación con martillo", series: "3 x 10", ritmo: "Lento", foco: "Control rotacional" },
  { id: "ep-05", lesionSlug: "epicondilitis", nombre: "Agarre progresivo", series: "3 x 15", ritmo: "Controlado", foco: "Fuerza funcional" },
  { id: "ep-06", lesionSlug: "epicondilitis", nombre: "Movilidad de codo activa", series: "2 x 10", ritmo: "Continuo", foco: "Rango articular" },
  { id: "cv-01", lesionSlug: "cervicalgia", nombre: "Retracción cervical (mentón)", series: "3 x 10", ritmo: "2s sostén", foco: "Control postural" },
  { id: "cv-02", lesionSlug: "cervicalgia", nombre: "Rotación cervical suave", series: "2 x 8 por lado", ritmo: "Lento", foco: "Movilidad" },
  { id: "cv-03", lesionSlug: "cervicalgia", nombre: "Inclinación lateral de cuello", series: "2 x 8 por lado", ritmo: "Lento", foco: "Elongación trapecio" },
  { id: "cv-04", lesionSlug: "cervicalgia", nombre: "Isométrico cervical multidireccional", series: "4 x 15s", ritmo: "Estático", foco: "Fuerza cervical profunda" },
  { id: "cv-05", lesionSlug: "cervicalgia", nombre: "Retracción escapular", series: "3 x 12", ritmo: "Controlado", foco: "Postura de hombros" },
  { id: "cv-06", lesionSlug: "cervicalgia", nombre: "Estiramiento de trapecio superior", series: "3 x 30s por lado", ritmo: "Estático", foco: "Liberación tensional" },
];

export function ejerciciosPorLesion(slug: string) {
  return ejercicios.filter((e) => e.lesionSlug === slug);
}
