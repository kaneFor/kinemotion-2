/**
 * Explicación de cada ejercicio (objetivo y movimiento), que se muestra como
 * texto y se puede escuchar por voz.
 *
 * IMPORTANTE: estos textos son PROVISORIOS. Deben ser revisados y aprobados
 * por el kinesiólogo revisor antes de usarse con pacientes (ver objetivo
 * específico 1 del documento).
 */

export type Guia = { objetivo: string; movimiento: string };

export const COLOCACION =
  "Para la guía por cámara, colócate de lado, a unos dos metros, con el cuerpo completo dentro del encuadre.";

/**
 * Colocación de la cámara cuando el ejercicio necesita algo distinto de la
 * indicación general. En los ejercicios de pie y tobillo lo crítico es que
 * los pies se vean grandes y completos: son los puntos que el modelo de
 * pose detecta con menos precisión.
 */
const colocacionPorEjercicio: Record<string, string> = {
  "et-03":
    "Apoya el celular a la altura de tu cintura, a unos dos metros y medio, y ponte de lado o de frente. Debe verse tu cuerpo completo, de la cabeza a los pies, con buena luz. Si necesitas apoyo, usa el respaldo de una silla que no te tape.",
};

export const colocacionDe = (ejercicioId: string) =>
  colocacionPorEjercicio[ejercicioId] ?? COLOCACION;

export const guias: Record<string, Guia> = {
  // Esguince de tobillo
  "et-01": {
    objetivo: "Recuperar la movilidad del tobillo de forma suave y controlada.",
    movimiento:
      "Sentado o recostado, con el pie en el aire, dibuja círculos lentos con la punta del pie, diez hacia cada lado. Mueve solo el tobillo, sin mover la pierna.",
  },
  "et-02": {
    objetivo: "Trabajar la movilidad del tobillo en todas las direcciones.",
    movimiento:
      "Con el pie en el aire, dibuja con la punta del pie las letras del abecedario, de forma continua y sin mover la rodilla.",
  },
  "et-03": {
    objetivo:
      "Fortalecer el músculo de la pantorrilla, el gemelo, que ayuda a estabilizar el tobillo.",
    movimiento:
      "De pie, con las rodillas estiradas, sube los talones en dos segundos hasta quedar en la punta de los pies y bájalos lentamente en otros dos segundos. Repite doce veces.",
  },
  "et-04": {
    objetivo: "Mejorar el equilibrio y el control del tobillo.",
    movimiento:
      "De pie, apoya el peso en una pierna y levanta la otra. Mantén la posición treinta segundos con el tronco erguido, cerca de una pared por si necesitas apoyo.",
  },
  "et-05": {
    objetivo: "Fortalecer los músculos que estabilizan el tobillo hacia el lado externo.",
    movimiento:
      "Con una banda elástica en el pie, gira lentamente la planta hacia adentro y vuelve de forma controlada. Mueve solo el tobillo. Quince repeticiones.",
  },
  "et-06": {
    objetivo: "Practicar una carga funcional del tobillo y la pierna al bajar y subir.",
    movimiento:
      "De pie sobre un escalón bajo, flexiona las rodillas con el tronco erguido y los talones apoyados, baja de forma controlada y vuelve a subir. Diez repeticiones.",
  },

  // Fascitis plantar
  "fp-01": {
    objetivo: "Aliviar la tensión de la planta del pie.",
    movimiento:
      "Sentado, con el pie sobre una pelota pequeña, rueda lentamente la pelota desde el talón hacia los dedos, con presión suave y sin dolor, durante dos minutos.",
  },
  "fp-02": {
    objetivo: "Estirar la planta del pie y la fascia plantar.",
    movimiento:
      "Sentado, con una toalla bajo la parte delantera del pie, tira suavemente de los extremos hacia ti con la rodilla estirada. Mantén treinta segundos, tres veces.",
  },
  "fp-03": {
    objetivo: "Fortalecer los músculos pequeños del pie.",
    movimiento:
      "Sentado, con los pies en el suelo, toma canicas con los dedos y suéltalas en un recipiente, sin levantar el talón. Quince repeticiones.",
  },
  "fp-04": {
    objetivo: "Fortalecer el pie y la pantorrilla con un descenso lento.",
    movimiento:
      "De pie sobre el borde de un escalón, con apoyo de una pared o barandilla, sube a la punta de los pies y baja el talón lentamente en tres segundos. Doce repeticiones.",
  },
  "fp-05": {
    objetivo: "Estirar la pantorrilla, que se relaciona con la tensión de la planta del pie.",
    movimiento:
      "De pie frente a una pared, lleva una pierna hacia atrás con el talón apoyado y la rodilla estirada, e inclínate hacia la pared hasta sentir un estiramiento suave. Mantén treinta segundos.",
  },
  "fp-06": {
    objetivo: "Recuperar el patrón de marcha sobre la punta y el talón.",
    movimiento:
      "Camina diez metros con control: primero apoyando solo las puntas de los pies y luego solo los talones, con el tronco erguido.",
  },

  // Tendinitis de muñeca
  "tm-01": {
    objetivo: "Mantener el deslizamiento de los tendones de la mano y la muñeca.",
    movimiento:
      "Con la mano frente a ti, pasa lentamente de la mano abierta a un puño suave, siguiendo las posiciones que indique tu profesional, sin forzar. Diez repeticiones.",
  },
  "tm-02": {
    objetivo: "Recuperar el rango de movimiento de la muñeca.",
    movimiento:
      "Con el antebrazo apoyado en una mesa, dobla la muñeca hacia arriba y hacia abajo de forma lenta y controlada. Doce repeticiones.",
  },
  "tm-03": {
    objetivo: "Fortalecer el agarre sin mover la muñeca.",
    movimiento:
      "Aprieta suavemente una pelota blanda o una toalla enrollada y mantén la presión veinte segundos, sin dolor, con la muñeca en posición neutra.",
  },
  "tm-04": {
    objetivo: "Controlar el giro del antebrazo y la muñeca.",
    movimiento:
      "Con el codo pegado al cuerpo y un peso ligero en la mano, gira lentamente la palma hacia arriba y hacia abajo. Diez repeticiones.",
  },
  "tm-05": {
    objetivo: "Estirar los músculos de la parte interna del antebrazo.",
    movimiento:
      "Con el brazo estirado y la palma hacia arriba, tira suavemente de los dedos hacia ti con la otra mano hasta sentir un estiramiento leve. Mantén treinta segundos.",
  },
  "tm-06": {
    objetivo: "Fortalecer los músculos que levantan la muñeca.",
    movimiento:
      "Con el antebrazo apoyado y una banda elástica en la mano, sube la muñeca contra la resistencia y baja de forma controlada. Quince repeticiones.",
  },

  // Epicondilitis lateral
  "ep-01": {
    objetivo: "Reducir la carga sobre el tendón del codo con una contracción sin movimiento.",
    movimiento:
      "Con el antebrazo apoyado y la palma hacia abajo, empuja suavemente la muñeca hacia arriba contra la otra mano, sin que se mueva. Mantén veinte segundos.",
  },
  "ep-02": {
    objetivo: "Fortalecer el tendón con un descenso lento.",
    movimiento:
      "Con el antebrazo apoyado y una mancuerna liviana, sube la muñeca con ayuda de la otra mano y bájala muy lentamente en cuatro segundos. Doce repeticiones.",
  },
  "ep-03": {
    objetivo: "Estirar los músculos del lado externo del antebrazo.",
    movimiento:
      "Con el brazo estirado y la palma hacia abajo, flexiona la muñeca hacia abajo y empuja suavemente con la otra mano hasta sentir un estiramiento leve. Mantén treinta segundos.",
  },
  "ep-04": {
    objetivo: "Controlar el giro del antebrazo con carga ligera.",
    movimiento:
      "Con el codo apoyado y un martillo o peso liviano tomado por el mango, gira lentamente el antebrazo de un lado a otro. Diez repeticiones.",
  },
  "ep-05": {
    objetivo: "Recuperar la fuerza de agarre de forma progresiva.",
    movimiento:
      "Aprieta una pelota blanda con fuerza moderada, mantén un instante y suelta lentamente. Quince repeticiones, aumentando la presión solo si no hay dolor.",
  },
  "ep-06": {
    objetivo: "Mantener la movilidad del codo.",
    movimiento:
      "Con el brazo a un costado, dobla y estira el codo de forma continua y controlada, sin forzar al final del recorrido. Diez repeticiones.",
  },

  // Cervicalgia tensional
  "cv-01": {
    objetivo: "Mejorar el control de la postura del cuello.",
    movimiento:
      "Sentado o de pie con la mirada al frente, lleva suavemente el mentón hacia atrás, como haciendo una doble papada, y mantén dos segundos. Diez repeticiones.",
  },
  "cv-02": {
    objetivo: "Recuperar la movilidad del cuello.",
    movimiento:
      "Gira lentamente la cabeza hacia un lado hasta donde sea cómodo, vuelve al centro y repite hacia el otro lado. Ocho veces por lado.",
  },
  "cv-03": {
    objetivo: "Estirar los músculos laterales del cuello y el trapecio.",
    movimiento:
      "Inclina lentamente la oreja hacia el hombro del mismo lado, sin subir el hombro, y vuelve al centro. Ocho veces por lado.",
  },
  "cv-04": {
    objetivo: "Fortalecer los músculos profundos del cuello sin mover la cabeza.",
    movimiento:
      "Apoya la mano en la frente, en un lado de la cabeza o en la nuca y empuja suavemente contra ella, sin que la cabeza se mueva. Mantén quince segundos en cada dirección.",
  },
  "cv-05": {
    objetivo: "Mejorar la postura de los hombros.",
    movimiento:
      "Sentado o de pie, junta suavemente los omóplatos hacia atrás y abajo, mantén un instante y suelta. Doce repeticiones.",
  },
  "cv-06": {
    objetivo: "Soltar la tensión del trapecio superior.",
    movimiento:
      "Sentado, inclina la cabeza hacia un lado y apoya suavemente la mano del mismo lado, mientras el otro brazo cuelga relajado. Mantén treinta segundos por lado.",
  },
};

const SEGURIDAD =
  "Si sientes dolor, detén el ejercicio y consulta a tu profesional.";

/** Texto completo que se lee en voz alta. */
export function textoGuia(g: Guia): string {
  return `Objetivo del ejercicio: ${g.objetivo} Cómo se hace: ${g.movimiento} ${SEGURIDAD}`;
}
