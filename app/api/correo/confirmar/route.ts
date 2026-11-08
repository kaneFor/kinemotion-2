import { NextRequest, NextResponse } from "next/server";
import { confirmarCorreo } from "@/lib/verificacion";

/**
 * Es un POST lanzado por un botón, no por abrir el enlace: los filtros de
 * correo visitan los enlaces de los mensajes y confirmarían solos.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (typeof body?.token !== "string" || !body.token) {
    return NextResponse.json({ error: "Enlace no válido." }, { status: 400 });
  }

  try {
    if (!(await confirmarCorreo(body.token))) {
      return NextResponse.json(
        { error: "El enlace no es válido o ya venció. Pide uno nuevo en Mi cuenta." },
        { status: 410 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/correo/confirmar:", err);
    return NextResponse.json(
      { error: "No se pudo confirmar el correo. Intenta más tarde." },
      { status: 500 }
    );
  }
}
