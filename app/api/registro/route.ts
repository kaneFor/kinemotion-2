import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { cifrar } from "@/lib/crypto";
import { lesiones } from "@/lib/data";
import { crearSesion } from "@/lib/sesion";
import { pistaDeError } from "@/lib/errores";

/**
 * Registro de usuario:
 *  - valida el formulario
 *  - hashea la contraseña (bcrypt, nunca texto plano)
 *  - cifra el perfil clínico (AES-256-GCM) antes de guardarlo
 *  - separa credenciales (colección `usuarios`) de datos clínicos
 *    (colección `perfiles_clinicos`), como describe el modelo de datos
 *    conceptual del proyecto
 *  - deja la cuenta con la sesión iniciada
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.nombre || !body?.correo || !body?.password || !body?.lesion) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 }
    );
  }

  if (!body.consiente) {
    return NextResponse.json(
      { error: "Se requiere el consentimiento informado." },
      { status: 400 }
    );
  }

  if (!lesiones.some((l) => l.slug === body.lesion)) {
    return NextResponse.json({ error: "Lesión no válida." }, { status: 400 });
  }

  if (String(body.password).length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const usuarios = db.collection("usuarios");

    const correo = String(body.correo).trim().toLowerCase();
    const existente = await usuarios.findOne({ correo });
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(String(body.password), 12);

    // El tipo de lesión es un dato clínico sensible: se cifra ANTES de
    // guardar cualquier cosa, así un fallo de cifrado no deja un usuario
    // huérfano, y queda en una colección separada de las credenciales.
    const lesionCifrada = cifrar(String(body.lesion));

    const usuario = await usuarios.insertOne({
      nombre: body.nombre,
      correo,
      passwordHash,
      creadoEn: new Date(),
    });

    try {
      await db.collection("perfiles_clinicos").insertOne({
        usuarioId: usuario.insertedId,
        lesion: lesionCifrada,
        consentimiento: {
          aceptado: true,
          fecha: new Date(),
        },
        creadoEn: new Date(),
      });
    } catch (err) {
      // Si falla el perfil, se deshace el usuario para no dejar datos a medias.
      await usuarios.deleteOne({ _id: usuario.insertedId });
      throw err;
    }

    // La cuenta ya existe: si falla solo la sesión, no se responde con error
    // (el reintento chocaría con "ya existe"), se pide iniciar sesión.
    let sesion = true;
    try {
      await crearSesion(usuario.insertedId);
    } catch (err) {
      console.error("Cuenta creada, pero falló la sesión:", err);
      sesion = false;
    }

    return NextResponse.json({ ok: true, sesion }, { status: 201 });
  } catch (err) {
    console.error("Error en /api/registro:", err);
    const respuesta: { error: string; pista?: string } = {
      error: "No se pudo completar el registro. Intenta más tarde.",
    };
    // En desarrollo se indica la causa probable; en producción no se
    // exponen detalles internos.
    if (process.env.NODE_ENV !== "production") {
      respuesta.pista = pistaDeError(err);
    }
    return NextResponse.json(respuesta, { status: 500 });
  }
}
