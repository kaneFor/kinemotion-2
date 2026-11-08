import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { avisarCuentaEliminada, eliminarCuenta } from "@/lib/cuenta";
import { getDb } from "@/lib/mongodb";
import { cerrarSesion, obtenerUsuario } from "@/lib/sesion";

export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body?.confirmo !== true) {
    return NextResponse.json(
      { error: "Confirma que entiendes que esto no se puede deshacer." },
      { status: 400 }
    );
  }
  if (typeof body?.password !== "string" || !body.password) {
    return NextResponse.json({ error: "Ingresa tu contraseña." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const guardado = await db
      .collection("usuarios")
      .findOne({ _id: new ObjectId(usuario.id) }, { projection: { passwordHash: 1 } });
    if (!guardado || !(await bcrypt.compare(body.password, guardado.passwordHash))) {
      return NextResponse.json({ error: "La contraseña no es correcta." }, { status: 403 });
    }

    await eliminarCuenta(usuario.id);
    await cerrarSesion().catch(() => {});

    if (usuario.correoVerificado) {
      try {
        await avisarCuentaEliminada(usuario.nombre, usuario.correo);
      } catch (err) {
        console.error("Cuenta eliminada, pero falló el correo de aviso:", err);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/cuenta/eliminar:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar la cuenta. Intenta de nuevo; tus datos siguen guardados." },
      { status: 500 }
    );
  }
}
