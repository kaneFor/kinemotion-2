import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { cifrarLesiones } from "@/lib/acceso";
import { correoPuedeRecibir } from "@/lib/correo";
import { lesiones } from "@/lib/data";
import { lesionInicial } from "@/lib/rutina";
import { crearSesion } from "@/lib/sesion";
import { enviarConfirmacion } from "@/lib/verificacion";
import { pistaDeError } from "@/lib/errores";

/**
 * Registro de usuario:
 *  - valida el formulario y que el dominio del correo pueda recibir mensajes
 *  - hashea la contraseña (bcrypt, nunca texto plano)
 *  - cifra el perfil clínico (AES-256-GCM) antes de guardarlo
 *  - separa credenciales (colección `usuarios`) de datos clínicos
 *    (colección `perfiles_clinicos`), como describe el modelo de datos
 *    conceptual del proyecto
 *  - deja la cuenta con la sesión iniciada
 *  - envía el enlace para confirmar el correo
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

  const correo = String(body.correo).trim().toLowerCase();
  if (!(await correoPuedeRecibir(correo))) {
    return NextResponse.json(
      { error: "Ese correo no parece válido. Revisa que esté bien escrito." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const usuarios = db.collection("usuarios");

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
    const lesionesCifradas = cifrarLesiones([lesionInicial(String(body.lesion))]);

    const usuario = await usuarios.insertOne({
      nombre: body.nombre,
      correo,
      passwordHash,
      creadoEn: new Date(),
    });

    try {
      await db.collection("perfiles_clinicos").insertOne({
        usuarioId: usuario.insertedId,
        lesiones: lesionesCifradas,
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

    // Tampoco se bloquea el registro si falla el correo: se puede reenviar
    // desde "Mi cuenta".
    try {
      await enviarConfirmacion({ _id: usuario.insertedId, nombre: body.nombre, correo });
    } catch (err) {
      console.error("Cuenta creada, pero falló el correo de confirmación:", err);
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
