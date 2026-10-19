import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { extractText } from "unpdf";
import { getDb } from "@/lib/mongodb";
import { cifrar } from "@/lib/crypto";
import { obtenerUsuario } from "@/lib/sesion";
import { analizarPrescripcion } from "@/lib/prescripcion";
import { pistaDeError } from "@/lib/errores";
import type { PrescripcionGuardada } from "@/lib/acceso";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Sube la prescripción médica (PDF o texto), detecta la lesión y los
 * ejercicios indicados, y guarda SOLO ese resultado, cifrado, en el perfil
 * clínico. El archivo original no se almacena (minimización de datos).
 */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera los 5 MB." },
      { status: 400 }
    );
  }

  const esPdf = archivo.type === "application/pdf" || /\.pdf$/i.test(archivo.name);
  const esTexto = archivo.type.startsWith("text/") || /\.txt$/i.test(archivo.name);
  if (!esPdf && !esTexto) {
    return NextResponse.json(
      { error: "Sube la prescripción en PDF o en un archivo de texto (.txt)." },
      { status: 400 }
    );
  }

  let texto: string;
  try {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    texto = esPdf
      ? (await extractText(bytes, { mergePages: true })).text
      : new TextDecoder().decode(bytes);
  } catch (err) {
    console.error("No se pudo leer la prescripción:", err);
    return NextResponse.json(
      { error: "No pudimos leer el archivo. Revisa que no esté dañado o protegido con contraseña." },
      { status: 422 }
    );
  }

  if (texto.trim().length < 10) {
    return NextResponse.json(
      {
        error:
          "El documento no tiene texto legible. Si es una foto o un escaneo, pide a tu profesional la versión digital en PDF.",
      },
      { status: 422 }
    );
  }

  const resultado = analizarPrescripcion(texto);
  if (resultado.lesiones.length === 0) {
    return NextResponse.json(
      {
        error:
          "No encontramos en la prescripción ninguna de las lesiones o ejercicios que cubre KineMotion. Seguirás viendo los ejercicios de la lesión que elegiste al registrarte.",
      },
      { status: 422 }
    );
  }

  const prescripcion: PrescripcionGuardada = {
    archivo: archivo.name.slice(0, 200),
    subidaEn: new Date().toISOString(),
    lesiones: resultado.lesiones,
    ejercicios: resultado.ejercicios,
  };

  try {
    const db = await getDb();
    const r = await db.collection("perfiles_clinicos").updateOne(
      { usuarioId: new ObjectId(usuario.id) },
      { $set: { prescripcion: cifrar(JSON.stringify(prescripcion)), actualizadoEn: new Date() } }
    );
    if (r.matchedCount === 0) {
      return NextResponse.json(
        { error: "No encontramos tu perfil clínico." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, prescripcion });
  } catch (err) {
    return errorInterno(err);
  }
}

/** Quita la prescripción: vuelve a los ejercicios de la lesión del registro. */
export async function DELETE() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  try {
    const db = await getDb();
    await db.collection("perfiles_clinicos").updateOne(
      { usuarioId: new ObjectId(usuario.id) },
      { $unset: { prescripcion: "" }, $set: { actualizadoEn: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorInterno(err);
  }
}

function errorInterno(err: unknown) {
  console.error("Error en /api/prescripcion:", err);
  const respuesta: { error: string; pista?: string } = {
    error: "No se pudo guardar la prescripción. Intenta más tarde.",
  };
  if (process.env.NODE_ENV !== "production") {
    respuesta.pista = pistaDeError(err);
  }
  return NextResponse.json(respuesta, { status: 500 });
}
