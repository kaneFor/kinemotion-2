import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { obtenerAcceso } from "@/lib/acceso";
import { enviarCorreo, escaparHtml, urlApp } from "@/lib/correo";
import { leerEnv } from "@/lib/env";
import { getDb } from "@/lib/mongodb";
import { hoyEnChile, tocaRecordatorio, tokenBaja, type Recordatorios } from "@/lib/recordatorios";
import { limpiarVerificacionesVencidas } from "@/lib/verificacion";

// Una cuenta normal de Gmail admite 500 mensajes al día; se deja margen para
// los correos de confirmación.
const MAX_POR_EJECUCION = 400;

function autorizado(req: NextRequest): boolean {
  const secreto = leerEnv("CRON_SECRET");
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
}

/** Lo llama Vercel Cron una vez al día (ver vercel.json). */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = hoyEnChile();
  const usuarios = (await getDb()).collection("usuarios");
  const candidatos = await usuarios
    .find(
      {
        correoVerificadoEn: { $exists: true },
        "recordatorios.modo": { $in: ["personalizado", "inactividad"] },
      },
      {
        projection: {
          nombre: 1,
          correo: 1,
          recordatorios: 1,
          ultimoDiaActivo: 1,
          ultimoRecordatorio: 1,
        },
      }
    )
    .toArray();

  let enviados = 0;
  let fallidos = 0;

  for (const usuario of candidatos) {
    if (enviados >= MAX_POR_EJECUCION) break;
    const estado = {
      recordatorios: usuario.recordatorios as Recordatorios,
      ultimoDiaActivo: usuario.ultimoDiaActivo as string | undefined,
      ultimoRecordatorio: usuario.ultimoRecordatorio as string | undefined,
    };
    if (!tocaRecordatorio(estado, hoy)) continue;

    try {
      // Quien terminó todas sus lesiones ya no tiene nada que recordar.
      const { ejercicios } = await obtenerAcceso(usuario._id.toString());
      if (ejercicios.length === 0) continue;

      // Vercel puede repetir una ejecución: se reserva el envío de hoy antes
      // de mandarlo, y solo una de las dos gana.
      const reserva = await usuarios.updateOne(
        { _id: usuario._id, ultimoRecordatorio: { $ne: hoy } },
        { $set: { ultimoRecordatorio: hoy } }
      );
      if (reserva.modifiedCount === 0) continue;

      try {
        await enviarRecordatorio(usuario._id.toString(), usuario.nombre, usuario.correo);
        enviados++;
      } catch (err) {
        await usuarios.updateOne(
          { _id: usuario._id },
          estado.ultimoRecordatorio
            ? { $set: { ultimoRecordatorio: estado.ultimoRecordatorio } }
            : { $unset: { ultimoRecordatorio: "" } }
        );
        throw err;
      }
    } catch (err) {
      fallidos++;
      console.error("No se pudo enviar un recordatorio:", err);
    }
  }

  await limpiarVerificacionesVencidas();
  return NextResponse.json({ ok: true, enviados, fallidos });
}

function enviarRecordatorio(usuarioId: string, nombre: string, correo: string) {
  const base = urlApp();
  const token = tokenBaja(usuarioId);
  const rutina = `${base}/biblioteca`;
  const baja = `${base}/baja?token=${token}`;

  return enviarCorreo({
    para: correo,
    asunto: "Tus ejercicios de hoy te esperan",
    texto:
      `Hola ${nombre}:\n\n` +
      `Hoy todavía no entras a tu rutina de KineMotion. Unos minutos suman a tu recuperación:\n${rutina}\n\n` +
      `Si no quieres recibir más recordatorios, date de baja aquí:\n${baja}`,
    html:
      `<p>Hola ${escaparHtml(nombre)}:</p>` +
      "<p>Hoy todavía no entras a tu rutina de KineMotion. Unos minutos suman a tu recuperación.</p>" +
      `<p><a href="${rutina}">Ir a mi rutina</a></p>` +
      `<p style="font-size:12px;color:#666"><a href="${baja}">Dejar de recibir recordatorios</a></p>`,
    baja: `${base}/api/recordatorios/baja?token=${token}`,
  });
}
