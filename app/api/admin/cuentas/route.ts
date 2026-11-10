import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { obtenerAdmin } from "@/lib/sesion";

const Cambio = z.object({
  id: z.string().refine((id) => ObjectId.isValid(id)),
  accion: z.enum(["habilitar", "deshabilitar"]),
});

/** Habilita o deshabilita una cuenta de paciente (RF15). Solo administradores. */
export async function POST(req: NextRequest) {
  if (!(await obtenerAdmin())) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const parsed = Cambio.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }
  const _id = new ObjectId(parsed.data.id);

  try {
    const db = await getDb();
    // Otro administrador no se puede deshabilitar desde aquí.
    const filtro = { _id, rol: { $ne: "admin" } };
    const r =
      parsed.data.accion === "deshabilitar"
        ? await db.collection("usuarios").updateOne(filtro, { $set: { deshabilitadaEn: new Date() } })
        : await db.collection("usuarios").updateOne(filtro, { $unset: { deshabilitadaEn: "" } });
    if (r.matchedCount === 0) {
      return NextResponse.json({ error: "Esa cuenta no existe." }, { status: 404 });
    }
    if (parsed.data.accion === "deshabilitar") {
      await db.collection("sesiones").deleteMany({ usuarioId: _id });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/admin/cuentas:", err);
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 500 });
  }
}
