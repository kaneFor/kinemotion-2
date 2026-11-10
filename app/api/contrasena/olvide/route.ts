import { NextRequest, NextResponse, after } from "next/server";
import { pedirRecuperacion } from "@/lib/contrasena";

/**
 * Siempre responde lo mismo y al instante; el correo se envía después de
 * responder, para que ni el mensaje ni el tiempo de respuesta revelen si
 * el correo tiene una cuenta.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const correo = typeof body?.correo === "string" ? body.correo.trim() : "";
  if (!correo || correo.length > 254) {
    return NextResponse.json({ error: "Ingresa tu correo." }, { status: 400 });
  }

  after(async () => {
    try {
      await pedirRecuperacion(correo);
    } catch (err) {
      console.error("Error al enviar la recuperación de contraseña:", err);
    }
  });

  return NextResponse.json({ ok: true });
}
