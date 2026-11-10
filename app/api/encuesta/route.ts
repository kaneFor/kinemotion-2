import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardarEncuesta } from "@/lib/encuesta";
import { lunesDe } from "@/lib/progreso";
import { hoyEnChile } from "@/lib/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

const escala = z.number().int().min(1).max(5);
const Encuesta = z.union([
  z.object({ omitir: z.literal(true) }),
  z.object({
    utilidad: escala,
    claridad: escala,
    dificultad: escala,
    comentario: z.string().trim().max(1000).optional(),
  }),
]);

/** Encuesta de la semana actual: responderla u omitirla. */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const parsed = Encuesta.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Responde las tres preguntas." }, { status: 400 });
  }

  try {
    const semana = lunesDe(hoyEnChile());
    const datos = parsed.data;
    await guardarEncuesta(
      usuario.id,
      semana,
      "omitir" in datos
        ? { omitida: true }
        : {
            utilidad: datos.utilidad,
            claridad: datos.claridad,
            dificultad: datos.dificultad,
            ...(datos.comentario ? { comentario: datos.comentario } : {}),
          }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/encuesta:", err);
    return NextResponse.json(
      { error: "No se pudo guardar la encuesta. Intenta más tarde." },
      { status: 500 }
    );
  }
}
