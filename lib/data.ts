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
  media?: string; // ruta de un video propio en /public, p. ej. "/ejercicios/et-03.mp4"
  youtube?: VideoYouTube;
};

/**
 * Demostración en YouTube. La mayoría son de ProET, la plataforma de
 * ejercicio terapéutico de los Colegios de Fisioterapeutas (clips cortos de
 * un solo ejercicio, mismo formato). `aproximado`: el video muestra una
 * variante parecida, no exactamente el ejercicio indicado.
 */
export type VideoYouTube = {
  id: string;
  canal: string;
  titulo: string;
  aproximado?: boolean;
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
  { id: "et-01", lesionSlug: "esguince-tobillo", nombre: "Círculos de tobillo", series: "3 x 10 por lado", ritmo: "Lento y controlado", foco: "Rango articular", youtube: { id: "P4cL8ZHMt2s", canal: "Proet Ejercicio Terapéutico", titulo: "783. Eversión e inversión", aproximado: true } },
  { id: "et-02", lesionSlug: "esguince-tobillo", nombre: "Alfabeto con el pie", series: "1 x abecedario", ritmo: "Continuo", foco: "Movilidad", youtube: { id: "yubU17YnuUs", canal: "Proet Ejercicio Terapéutico", titulo: "782. Flexión plantar y dorsiflexión", aproximado: true } },
  { id: "et-03", lesionSlug: "esguince-tobillo", nombre: "Elevación de talones", series: "3 x 12", ritmo: "2s subida, 2s bajada", foco: "Fuerza gemelo", angleTarget: { joint: "elevacion", relativo: true, min: 6, max: 60, descripcion: "Cuánto sube tu cuerpo al ponerte en puntas" }, youtube: { id: "xDrezw4UkoE", canal: "Proet Ejercicio Terapéutico", titulo: "885. Elevación de talones de pie apoyado" } },
  { id: "et-04", lesionSlug: "esguince-tobillo", nombre: "Equilibrio monopodal", series: "3 x 30s", ritmo: "Estático", foco: "Propiocepción", youtube: { id: "HIjmx9X3WNo", canal: "Proet Ejercicio Terapéutico", titulo: "762. Equilibrio sobre una pierna" } },
  { id: "et-05", lesionSlug: "esguince-tobillo", nombre: "Banda elástica en inversión", series: "3 x 15", ritmo: "Controlado", foco: "Estabilidad lateral", youtube: { id: "Om-XxhR1FTs", canal: "Proet Ejercicio Terapéutico", titulo: "784. Inversión de tobillo" } },
  { id: "et-06", lesionSlug: "esguince-tobillo", nombre: "Sentadilla en step", series: "3 x 10", ritmo: "Moderado", foco: "Carga funcional", angleTarget: { joint: "rodilla", min: 70, max: 100, descripcion: "Flexión de rodilla dentro de rango seguro" }, youtube: { id: "vMquIqorw9c", canal: "Proet Ejercicio Terapéutico", titulo: "763. Cuarto de sentadilla con ayuda", aproximado: true } },
  { id: "fp-01", lesionSlug: "fascitis-plantar", nombre: "Rodillo plantar con pelota", series: "2 x 2 min", ritmo: "Lento", foco: "Liberación fascial", youtube: { id: "kRSgcgv1Zjs", canal: "Proet Ejercicio Terapéutico", titulo: "804. Masaje para fascitis plantar con pelota" } },
  { id: "fp-02", lesionSlug: "fascitis-plantar", nombre: "Estiramiento de fascia con toalla", series: "3 x 30s", ritmo: "Estático", foco: "Elongación", youtube: { id: "BiSHoVWpOfY", canal: "Proet Ejercicio Terapéutico", titulo: "750. Estiramiento de la fascia plantar" } },
  { id: "fp-03", lesionSlug: "fascitis-plantar", nombre: "Toma de canicas con los dedos", series: "2 x 15", ritmo: "Controlado", foco: "Musculatura intrínseca", youtube: { id: "FZwIEwtquG0", canal: "Proet Ejercicio Terapéutico", titulo: "810. Arrugar una toalla con los dedos del pie", aproximado: true } },
  { id: "fp-04", lesionSlug: "fascitis-plantar", nombre: "Elevación de talón en escalón", series: "3 x 12", ritmo: "3s excéntrico", foco: "Fuerza fascia", youtube: { id: "q0X_0Dtyg_0", canal: "Proet Ejercicio Terapéutico", titulo: "748. Excéntrico de gemelo" } },
  { id: "fp-05", lesionSlug: "fascitis-plantar", nombre: "Estiramiento gemelo en pared", series: "3 x 30s", ritmo: "Estático", foco: "Cadena posterior", youtube: { id: "fdUIoXl_4xY", canal: "Proet Ejercicio Terapéutico", titulo: "746. Estiramiento de gemelo de pie" } },
  { id: "fp-06", lesionSlug: "fascitis-plantar", nombre: "Marcha en punta y talón", series: "3 x 10 m", ritmo: "Moderado", foco: "Retorno funcional", youtube: { id: "T-mjCqED1ug", canal: "FisioOnline", titulo: "Caminar de puntillas y talones para recuperar lesiones y fracturas" } },
  { id: "tm-01", lesionSlug: "tendinitis-muneca", nombre: "Deslizamiento de tendones", series: "2 x 10", ritmo: "Lento", foco: "Movilidad tendinosa", youtube: { id: "PQgCIFkUfvk", canal: "Nottingham University Hospitals NHS Trust", titulo: "Tendon Gliding Exercises" } },
  { id: "tm-02", lesionSlug: "tendinitis-muneca", nombre: "Flexo-extensión de muñeca", series: "3 x 12", ritmo: "Controlado", foco: "Rango articular", youtube: { id: "3P2pe6q4EcU", canal: "Proet Ejercicio Terapéutico", titulo: "792. Extensión de muñeca con carga", aproximado: true } },
  { id: "tm-03", lesionSlug: "tendinitis-muneca", nombre: "Isométrico de agarre", series: "3 x 20s", ritmo: "Estático", foco: "Fuerza de agarre", youtube: { id: "RC6u4aFE7kE", canal: "Sanitas", titulo: "Apretar una pelota" } },
  { id: "tm-04", lesionSlug: "tendinitis-muneca", nombre: "Pronosupinación con peso ligero", series: "3 x 10", ritmo: "Lento", foco: "Control rotacional", youtube: { id: "RjHOuDn5i-4", canal: "Proet Ejercicio Terapéutico", titulo: "365. Pronación y supinación de antebrazo con mancuerna" } },
  { id: "tm-05", lesionSlug: "tendinitis-muneca", nombre: "Estiramiento de flexores", series: "3 x 30s", ritmo: "Estático", foco: "Elongación", youtube: { id: "JdcRjhW9WFE", canal: "Proet Ejercicio Terapéutico", titulo: "789. Estiramiento de los flexores de la muñeca" } },
  { id: "tm-06", lesionSlug: "tendinitis-muneca", nombre: "Extensión con banda elástica", series: "3 x 15", ritmo: "Moderado", foco: "Fuerza extensora", youtube: { id: "aW5Dqo2cnnY", canal: "Proet Ejercicio Terapéutico", titulo: "791. Extensión excéntrica de muñeca con banda elástica" } },
  { id: "ep-01", lesionSlug: "epicondilitis", nombre: "Isométrico de extensores", series: "4 x 20s", ritmo: "Estático", foco: "Descarga tendinosa", youtube: { id: "oZkJ0Q8POFQ", canal: "Proet Ejercicio Terapéutico", titulo: "128. Movimientos de muñeca con oposición de la otra mano", aproximado: true } },
  { id: "ep-02", lesionSlug: "epicondilitis", nombre: "Excéntrico de muñeca con mancuerna", series: "3 x 12", ritmo: "4s bajada", foco: "Remodelación tendinosa", youtube: { id: "r1yrlQyXZuc", canal: "Proet Ejercicio Terapéutico", titulo: "798. Extensión excentrica de muñeca con carga" } },
  { id: "ep-03", lesionSlug: "epicondilitis", nombre: "Estiramiento de epicóndilo", series: "3 x 30s", ritmo: "Estático", foco: "Elongación", youtube: { id: "8yMwlXRl64M", canal: "Proet Ejercicio Terapéutico", titulo: "944. Estiramiento de extensores de muñeca" } },
  { id: "ep-04", lesionSlug: "epicondilitis", nombre: "Pronosupinación con martillo", series: "3 x 10", ritmo: "Lento", foco: "Control rotacional", youtube: { id: "RjHOuDn5i-4", canal: "Proet Ejercicio Terapéutico", titulo: "365. Pronación y supinación de antebrazo con mancuerna" } },
  { id: "ep-05", lesionSlug: "epicondilitis", nombre: "Agarre progresivo", series: "3 x 15", ritmo: "Controlado", foco: "Fuerza funcional", youtube: { id: "yDB8trR_Wv8", canal: "Clínica Fisalia", titulo: "Ejercicio para la musculatura de la mano con pelota de tenis" } },
  { id: "ep-06", lesionSlug: "epicondilitis", nombre: "Movilidad de codo activa", series: "2 x 10", ritmo: "Continuo", foco: "Rango articular", youtube: { id: "vAk6Gx4XDVs", canal: "Recupera't Online", titulo: "Flexión y extensión de codo" } },
  { id: "cv-01", lesionSlug: "cervicalgia", nombre: "Retracción cervical (mentón)", series: "3 x 10", ritmo: "2s sostén", foco: "Control postural", youtube: { id: "YkfV6KtO-dg", canal: "Proet Ejercicio Terapéutico", titulo: "892. Doble barbilla con retraccion escapular" } },
  { id: "cv-02", lesionSlug: "cervicalgia", nombre: "Rotación cervical suave", series: "2 x 8 por lado", ritmo: "Lento", foco: "Movilidad", youtube: { id: "KIQibFykcWY", canal: "Proet Ejercicio Terapéutico", titulo: "889. Rotación del cuello a la derecha" } },
  { id: "cv-03", lesionSlug: "cervicalgia", nombre: "Inclinación lateral de cuello", series: "2 x 8 por lado", ritmo: "Lento", foco: "Elongación trapecio", youtube: { id: "84cLqloUU64", canal: "Proet Ejercicio Terapéutico", titulo: "891. Inclinación de la cabeza a la derecha" } },
  { id: "cv-04", lesionSlug: "cervicalgia", nombre: "Isométrico cervical multidireccional", series: "4 x 15s", ritmo: "Estático", foco: "Fuerza cervical profunda", youtube: { id: "HCYa4W4ViJc", canal: "Proet Ejercicio Terapéutico", titulo: "964. Flexión isométrica cuello" } },
  { id: "cv-05", lesionSlug: "cervicalgia", nombre: "Retracción escapular", series: "3 x 12", ritmo: "Controlado", foco: "Postura de hombros", youtube: { id: "KOn0vhH3v5s", canal: "Proet Ejercicio Terapéutico", titulo: "807.Retracción escapular" } },
  { id: "cv-06", lesionSlug: "cervicalgia", nombre: "Estiramiento de trapecio superior", series: "3 x 30s por lado", ritmo: "Estático", foco: "Liberación tensional", youtube: { id: "xuHvrFvrKFQ", canal: "Proet Ejercicio Terapéutico", titulo: "289. Estiramiento para trapecio superior" } },
];
