import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { crearSesion } from "@/lib/sesion";
import { pistaDeError } from "@/lib/errores";

const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.correo || !body?.password) {
    return NextResponse.json(
      { error: "Ingresa tu correo y contraseña." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const correo = String(body.correo).trim();
    // Las cuentas nuevas guardan el correo en minúsculas; las anteriores,
    // tal como se escribió.
    const usuario = await db
      .collection("usuarios")
      .findOne({ correo: { $in: [correo.toLowerCase(), correo] } });

    // Mismo mensaje si el correo no existe o la contraseña no calza, para no
    // revelar qué correos están registrados.
    const valido =
      usuario && (await bcrypt.compare(String(body.password), usuario.passwordHash));
    if (!usuario || !valido) {
      return NextResponse.json({ error: CREDENCIALES_INVALIDAS }, { status: 401 });
    }

    if (usuario.deshabilitadaEn) {
      return NextResponse.json(
        { error: "Esta cuenta está deshabilitada. Si crees que es un error, escríbenos." },
        { status: 403 }
      );
    }

    await crearSesion(usuario._id);
    return NextResponse.json({ ok: true, destino: usuario.rol === "admin" ? "/admin" : "/biblioteca" });
  } catch (err) {
    console.error("Error en /api/login:", err);
    const respuesta: { error: string; pista?: string } = {
      error: "No se pudo iniciar sesión. Intenta más tarde.",
    };
    if (process.env.NODE_ENV !== "production") {
      respuesta.pista = pistaDeError(err);
    }
    return NextResponse.json(respuesta, { status: 500 });
  }
}
