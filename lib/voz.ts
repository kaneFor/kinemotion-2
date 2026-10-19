/**
 * Voz de la guía. Usa la síntesis de voz del propio navegador
 * (Web Speech API): no requiere API, claves ni costo.
 *
 * Nota de privacidad: según el navegador, la voz puede ser local o en línea.
 * En ambos casos solo se envía el texto fijo del mensaje, nunca imagen ni
 * datos del usuario.
 */

export function vozDisponible(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function elegirVoz(): SpeechSynthesisVoice | null {
  if (!vozDisponible()) return null;
  const voces = window.speechSynthesis.getVoices();
  const preferidas = ["es-cl", "es-mx", "es-us", "es-ar", "es-es"];
  for (const l of preferidas) {
    const v = voces.find((x) => x.lang.replace("_", "-").toLowerCase() === l);
    if (v) return v;
  }
  return voces.find((x) => x.lang.toLowerCase().startsWith("es")) ?? null;
}

/**
 * Lee un texto en voz alta. Lo divide en frases para evitar el corte de
 * enunciados largos que ocurre en algunos navegadores. Por defecto
 * interrumpe lo que se estuviera diciendo.
 */
export function hablar(
  texto: string,
  opciones?: { interrumpir?: boolean; onFin?: () => void }
): boolean {
  if (!vozDisponible()) return false;
  const s = window.speechSynthesis;
  if (opciones?.interrumpir !== false) s.cancel();

  const frases = texto.match(/[^.!?]+[.!?]?/g)?.map((f) => f.trim()).filter(Boolean) ?? [texto];
  const voz = elegirVoz();
  let terminado = false;
  const terminar = () => {
    if (terminado) return;
    terminado = true;
    opciones?.onFin?.();
  };

  frases.forEach((frase, i) => {
    const u = new SpeechSynthesisUtterance(frase);
    u.lang = voz?.lang ?? "es-CL";
    if (voz) u.voice = voz;
    u.rate = 0.95;
    u.pitch = 1;
    if (i === frases.length - 1) u.onend = terminar;
    u.onerror = terminar;
    s.speak(u);
  });
  return true;
}

export function detenerVoz(): void {
  if (vozDisponible()) window.speechSynthesis.cancel();
}
