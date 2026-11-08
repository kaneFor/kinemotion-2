import { ejercicios, lesiones } from "@/lib/data";

/**
 * Análisis de la prescripción médica subida por el paciente.
 *
 * Se busca en el texto del documento:
 *  1. ejercicios concretos de la biblioteca (por nombre o sinónimos), y
 *  2. la lesión diagnosticada (por nombre, sinónimos o código CIE-10).
 *
 * Puede detectar varias lesiones, y cada una se resuelve por separado: si la
 * prescripción nombra ejercicios de esa lesión, el paciente solo accede a
 * esos; si solo nombra la lesión, accede a todos sus ejercicios.
 *
 * IMPORTANTE: los sinónimos de abajo son PROVISORIOS y deben ser revisados
 * por el kinesiólogo revisor, igual que las guías de `lib/guias.ts`.
 */

export type ResultadoPrescripcion = {
  lesiones: string[]; // slugs
  ejercicios: string[]; // ids
};

const sinonimosLesion: Record<string, string[]> = {
  "esguince-tobillo": [
    "esguince de tobillo",
    "esguince tobillo",
    "esguince del tobillo",
    "torcedura de tobillo",
    "lesion ligamentaria de tobillo",
    "ligamento peroneoastragalino",
    "s93.4",
  ],
  "fascitis-plantar": [
    "fascitis plantar",
    "fasciitis plantar",
    "fasciopatia plantar",
    "talalgia",
    "espolon calcaneo",
    "m72.2",
  ],
  "tendinitis-muneca": [
    "tendinitis de muneca",
    "tendinitis muneca",
    "tendinopatia de muneca",
    "tenosinovitis",
    "de quervain",
    "m65.4",
  ],
  epicondilitis: [
    "epicondilitis",
    "epicondilalgia",
    "codo de tenista",
    "m77.1",
  ],
  cervicalgia: [
    "cervicalgia",
    "dolor cervical",
    "contractura cervical",
    "torticolis",
    "m54.2",
  ],
};

// Además del nombre del ejercicio (que siempre se busca), formas habituales
// de escribirlo en una indicación.
const sinonimosEjercicio: Record<string, string[]> = {
  "et-01": ["circulos con el tobillo", "circunducciones de tobillo"],
  "et-02": ["abecedario con el pie", "alfabeto con el tobillo"],
  "et-03": ["elevacion de talon", "elevaciones de talones", "pantorrillas de pie"],
  "et-04": ["apoyo monopodal", "equilibrio en un pie", "balance monopodal"],
  "et-05": ["inversion con banda", "inversion con elastico", "theraband inversion"],
  "et-06": ["sentadilla en escalon", "sentadillas en step"],
  "fp-01": ["masaje plantar con pelota", "rodar pelota", "pelota bajo el pie"],
  "fp-02": ["estiramiento con toalla", "elongacion de fascia"],
  "fp-03": ["recoger canicas", "canicas con los dedos"],
  "fp-04": ["talon en escalon", "excentrico de gemelo en escalon"],
  "fp-05": ["estiramiento de gemelo", "elongacion de gemelo", "estiramiento de pantorrilla"],
  "fp-06": ["marcha en punta", "caminar en puntas y talones"],
  "tm-01": ["deslizamiento tendinoso", "tendon gliding"],
  "tm-02": ["flexoextension de muneca", "flexion y extension de muneca"],
  "tm-03": ["isometrico de prension", "apretar pelota"],
  "tm-04": ["pronosupinacion de muneca", "prono supinacion"],
  "tm-05": ["elongacion de flexores", "estiramiento flexores de muneca"],
  "tm-06": ["extension de muneca con banda", "extensores con elastico"],
  "ep-01": ["isometrico de extensores de muneca", "isometricos de codo"],
  "ep-02": ["excentrico de extensores", "excentricos de muneca", "tyler twist"],
  "ep-03": ["estiramiento de extensores", "elongacion de extensores"],
  "ep-04": ["pronosupinacion con peso", "giro con martillo"],
  "ep-05": ["agarre con pelota", "prension progresiva"],
  "ep-06": ["flexoextension de codo", "movilidad de codo"],
  "cv-01": ["retraccion cervical", "retraccion de menton", "chin tuck", "doble menton"],
  "cv-02": ["rotacion de cuello", "rotaciones cervicales"],
  "cv-03": ["inclinacion lateral cervical", "lateralizacion cervical"],
  "cv-04": ["isometricos cervicales", "isometrico de cuello"],
  "cv-05": ["retraccion de escapulas", "aproximacion escapular"],
  "cv-06": ["elongacion de trapecio", "estiramiento de trapecio"],
};

/** Minúsculas, sin tildes y con espacios simples, para comparar textos. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contiene(texto: string, frase: string): boolean {
  // Límites de palabra para que "m54.2" no calce con "m54.21", etc.
  const f = normalizar(frase).replace(/[.]/g, "\\.");
  return new RegExp(`(^|\\s)${f}(?=$|[\\s.])`).test(texto);
}

export function analizarPrescripcion(textoOriginal: string): ResultadoPrescripcion {
  const texto = normalizar(textoOriginal);

  const ejerciciosEncontrados = ejercicios
    .filter((e) =>
      [e.nombre, ...(sinonimosEjercicio[e.id] ?? [])].some((f) => contiene(texto, f))
    )
    .map((e) => e.id);

  const lesionesEncontradas = new Set(
    lesiones
      .filter((l) =>
        [l.nombre, ...(sinonimosLesion[l.slug] ?? [])].some((f) => contiene(texto, f))
      )
      .map((l) => l.slug)
  );
  // Un ejercicio indicado implica su lesión, aunque el documento no la nombre.
  for (const id of ejerciciosEncontrados) {
    const e = ejercicios.find((x) => x.id === id);
    if (e) lesionesEncontradas.add(e.lesionSlug);
  }

  return {
    lesiones: [...lesionesEncontradas],
    ejercicios: ejerciciosEncontrados,
  };
}
