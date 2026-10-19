import { NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/sesion";

export async function POST() {
  try {
    await cerrarSesion();
  } catch (err) {
    // Aunque falle la base, la cookie igual se borra en el cliente.
    console.error("Error en /api/logout:", err);
  }
  return NextResponse.json({ ok: true });
}
