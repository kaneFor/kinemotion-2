import { NextResponse } from "next/server";
import { exportarDatos } from "@/lib/cuenta";
import { hoyEnChile } from "@/lib/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

/** Descarga de todos los datos del paciente (derecho de acceso y portabilidad). */
export async function GET() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  try {
    const datos = await exportarDatos(usuario.id);
    return new NextResponse(JSON.stringify(datos, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="kinemotion-mis-datos-${hoyEnChile()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error en /api/cuenta/datos:", err);
    return NextResponse.json(
      { error: "No se pudieron preparar tus datos. Intenta más tarde." },
      { status: 500 }
    );
  }
}
