import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { obtenerUsuario } from "@/lib/sesion";
import { obtenerAcceso } from "@/lib/acceso";
import { lesiones, type Ejercicio } from "@/lib/data";
import { guias } from "@/lib/guias";
import { reglasPorEjercicio } from "@/lib/reglas";
import {
  MAX_MUESTRAS_POR_REP,
  MAX_REPS_POR_SOLICITUD,
  type RespuestaSupervision,
} from "@/lib/supervision";

/**
 * Supervisión del movimiento con Claude.
 *
 * Recibe las métricas numéricas de las repeticiones que el navegador
 * detectó (ángulos, duración, desviaciones posturales) y devuelve, para
 * cada una, si fue correcta, más un mensaje corto para leer en voz alta.
 * No recibe imágenes ni video.
 */

const MODELO = "claude-opus-5-5";

// Se crea recién al usarse, para que `next build` no falle sin la API key.
let cliente: Anthropic | null = null;
const getCliente = () => (cliente ??= new Anthropic());

// --- validación de la entrada (viene del navegador: no se confía en ella) ---

// En modo relativo los valores son diferencias y pueden ser negativos.
const grados = z.number().finite().min(-360).max(360);

const Solicitud = z.object({
  ejercicioId: z.string().max(20),
  modo: z.enum(["repeticion", "resumen"]),
  repeticiones: z
    .array(
      z.object({
        n: z.number().int().min(1).max(10000),
        duracionSeg: z.number().finite().min(0).max(600),
        anguloMin: grados,
        anguloMax: grados,
        serie: z.array(grados).max(MAX_MUESTRAS_POR_REP),
        desviaciones: z.record(z.string().max(40), z.number().min(0).max(1)),
        sinVisibilidad: z.number().min(0).max(1),
      })
    )
    .min(1)
    .max(MAX_REPS_POR_SOLICITUD),
});

// --- formato de la respuesta de Claude ---

const Respuesta = z.object({
  repeticiones: z.array(
    z.object({
      n: z.number().int(),
      valida: z.boolean(),
      motivo: z.string(),
    })
  ),
  estado: z.enum(["bien", "corregir"]),
  mensaje: z.string(),
  resumen: z.string(),
});

// --- límite simple de uso por usuario (protege el costo de la API) ---

const VENTANA_MS = 10 * 60 * 1000;
const MAX_LLAMADAS_POR_VENTANA = 60;
const uso = new Map<string, number[]>();

function excedeLimite(usuarioId: string): boolean {
  const ahora = Date.now();
  const recientes = (uso.get(usuarioId) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= MAX_LLAMADAS_POR_VENTANA) {
    uso.set(usuarioId, recientes);
    return true;
  }
  recientes.push(ahora);
  uso.set(usuarioId, recientes);
  return false;
}

// --- prompt ---

const SISTEMA = `Eres el supervisor de ejecución de KineMotion, una plataforma de rehabilitación guiada para lesiones leves. Un paciente está haciendo un ejercicio frente a la cámara de su computador o celular.

No ves la imagen. Recibes lo que mide un modelo de estimación de pose (MediaPipe) en una sola cámara 2D, vista lateral:
- el ángulo de la articulación objetivo, muestreado cada ~100 ms, para cada repetición;
- la duración de cada repetición;
- la fracción de cuadros en que se detectó cada desviación postural conocida;
- la fracción de cuadros en que la persona no se vio bien.

El navegador ya detectó las repeticiones con una regla simple (entrar y salir del rango objetivo). Tu trabajo es revisar cada una con criterio kinésico y decidir si fue una repetición correcta:
- Válida: recorrió el rango objetivo, a un ritmo razonable según la indicación, y sin desviaciones posturales sostenidas.
- No válida: rango incompleto, demasiado rápida o brusca, desviación postural presente en una parte importante de la repetición, o datos tan poco visibles que no se puede afirmar que se hizo bien. Si no se puede evaluar, márcala como no válida y dilo en el motivo.
Ten en cuenta que la medición 2D tiene ruido de unos pocos grados: no castigues diferencias pequeñas en el límite del rango.

Escribe en español de Chile, de tú, con tono cercano y motivador:
- "motivo": una frase corta por repetición, para mostrar en pantalla.
- "mensaje": UNA sola indicación para leer en voz alta mientras el paciente sigue ejercitando, de máximo 15 palabras. Si todo va bien, refuerza brevemente; si hay algo que corregir, nombra solo lo más importante y cómo corregirlo.
- "estado": "bien" si las repeticiones revisadas fueron correctas, "corregir" si hay algo que ajustar.
- "resumen": vacío en modo "repeticion". En modo "resumen", 2 a 4 frases sobre la serie completa: cuántas repeticiones fueron correctas, el error más frecuente y una recomendación para la próxima serie.

No diagnostiques, no cambies la indicación del profesional y no sugieras aumentar la carga. Si el patrón sugiere que el paciente podría tener dolor (movimiento muy lento, rango que se acorta repetición a repetición, pausas largas), recuérdale que se detenga si siente dolor y consulte a su profesional.`;

function contextoEjercicio(ejercicioId: string, ejercicio: Ejercicio) {
  const lesion = lesiones.find((l) => l.slug === ejercicio.lesionSlug);
  const guia = guias[ejercicioId];
  const reglas = reglasPorEjercicio[ejercicioId] ?? [];
  const t = ejercicio.angleTarget!;
  return [
    `Ejercicio: ${ejercicio.nombre} (${lesion?.nombre ?? ejercicio.lesionSlug}).`,
    `Indicación: ${ejercicio.series}, ritmo "${ejercicio.ritmo}", foco: ${ejercicio.foco}.`,
    guia ? `Objetivo: ${guia.objetivo}\nCómo se hace: ${guia.movimiento}` : "",
    t.joint === "elevacion"
      ? `Medición: cuánto SUBE el cuerpo (punto medio entre hombros y caderas) respecto de la postura inicial de pie, en % del largo del tronco. No son grados: todos los valores (serie, mínimo y máximo) están en esa unidad, y 0 = postura base. Objetivo: subir entre +${t.min}% y +${t.max}% y volver a la base (${t.descripcion}). Como referencia, una elevación de talones completa suele dar entre +10% y +16%.`
      : t.relativo
      ? `Articulación medida: ${t.joint}, en modo RELATIVO: todos los ángulos (serie, mínimo y máximo) son grados por sobre la postura inicial del paciente, tomada quieto al empezar (0° = postura base). Objetivo: alejarse entre +${t.min}° y +${t.max}° de la base y volver a ella (${t.descripcion}).`
      : `Articulación medida: ${t.joint}. Rango objetivo: ${t.min}°–${t.max}° (${t.descripcion}).`,
    reglas.length
      ? `Desviaciones posturales que se miden (id: qué significa):\n${reglas
          .map((r) => `- ${r.id}: ${r.mensaje}`)
          .join("\n")}`
      : "Para este ejercicio no se miden desviaciones posturales adicionales.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const parsed = Solicitud.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de movimiento no válidos." }, { status: 400 });
  }
  const solicitud = parsed.data;

  // Solo se supervisan ejercicios de la rutina del paciente.
  const acceso = await obtenerAcceso(usuario.id);
  const ejercicio = acceso.ejercicios.find((e) => e.id === solicitud.ejercicioId);
  if (!ejercicio?.angleTarget) {
    return NextResponse.json({ error: "Ejercicio no disponible." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "La supervisión con IA no está configurada.",
        pista:
          process.env.NODE_ENV !== "production"
            ? "Falta ANTHROPIC_API_KEY en .env.local. Reinicia npm run dev después de agregarla."
            : undefined,
      },
      { status: 503 }
    );
  }

  if (excedeLimite(usuario.id)) {
    return NextResponse.json(
      { error: "Demasiadas revisiones seguidas. Espera unos minutos." },
      { status: 429 }
    );
  }

  const datos = solicitud.repeticiones.map((r) => ({
    ...r,
    duracionSeg: Math.round(r.duracionSeg * 10) / 10,
    anguloMin: Math.round(r.anguloMin),
    anguloMax: Math.round(r.anguloMax),
    serie: r.serie.map(Math.round),
  }));

  try {
    const respuesta = await getCliente().beta.messages.parse({
      model: MODELO,
      max_tokens: 8000,
      // Respuesta rápida: la indicación llega mientras el paciente sigue
      // ejercitando.
      output_config: { effort: "low", format: betaZodOutputFormat(Respuesta) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: `${contextoEjercicio(solicitud.ejercicioId, ejercicio)}

Modo: ${solicitud.modo}
Repeticiones a revisar (JSON):
${JSON.stringify(datos)}`,
        },
      ],
    });

    if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) {
      console.warn("Supervisión sin respuesta utilizable:", respuesta.stop_reason);
      return NextResponse.json(
        { error: "La IA no pudo revisar estas repeticiones." },
        { status: 502 }
      );
    }

    const salida: RespuestaSupervision = respuesta.parsed_output;
    return NextResponse.json(salida);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY inválida.");
      return NextResponse.json(
        { error: "La supervisión con IA no está configurada correctamente." },
        { status: 503 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "La IA está saturada. Intenta en unos segundos." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Error de la API de Claude (${err.status}):`, err.message);
    } else {
      console.error("Error en /api/supervision:", err);
    }
    return NextResponse.json(
      { error: "No se pudo revisar el movimiento. Intenta más tarde." },
      { status: 502 }
    );
  }
}
