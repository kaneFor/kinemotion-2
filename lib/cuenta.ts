import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { obtenerAcceso } from "@/lib/acceso";
import { enviarCorreo, escaparHtml } from "@/lib/correo";
import { ejercicios } from "@/lib/data";
import { leerEncuestas } from "@/lib/encuesta";
import { enviosDe } from "@/lib/envios";
import { formatoHora, horaDe } from "@/lib/recordatorios";
import { leerDias } from "@/lib/historial";
import { DIAS_SEMANA, diasDeRutina } from "@/lib/progreso";
import { nombreLesion } from "@/lib/rutina";

/**
 * Derechos del paciente sobre sus datos: obtener una copia, corregirlos y
 * eliminarlos. Toda colección que guarde datos de un usuario debe aparecer
 * en COLECCIONES_DEL_USUARIO, o quedaría fuera al eliminar la cuenta.
 */
const COLECCIONES_DEL_USUARIO = [
  "historial_progreso",
  "encuestas",
  "envios_recordatorio",
  "recuperaciones_contrasena",
  "verificaciones_correo",
  "sesiones",
  "perfiles_clinicos",
] as const;

const nombreEjercicio = (id: string) => ejercicios.find((e) => e.id === id)?.nombre ?? id;

/** Copia legible de todo lo que la app guarda del paciente, ya descifrado. */
export async function exportarDatos(usuarioId: string) {
  const _id = new ObjectId(usuarioId);
  const db = await getDb();
  const usuario = await db
    .collection("usuarios")
    .findOne({ _id }, { projection: { passwordHash: 0 } });
  const perfil = await db.collection("perfiles_clinicos").findOne({ usuarioId: _id });
  const acceso = await obtenerAcceso(usuarioId);
  const dias = await leerDias(usuarioId, "0000-01-01");
  const encuestas = await leerEncuestas(usuarioId);
  const envios = await enviosDe(usuarioId);

  const perfilIlegible =
    Boolean(perfil?.lesiones || perfil?.lesion) && acceso.lesionesPaciente.length === 0;

  return {
    generadoEn: new Date().toISOString(),
    aviso:
      "Estos son todos los datos que KineMotion guarda sobre ti. En la base de datos, el perfil clínico y el historial están cifrados; aquí se entregan descifrados.",
    cuenta: {
      nombre: usuario?.nombre,
      correo: usuario?.correo,
      creadaEn: usuario?.creadoEn,
      correoConfirmadoEn: usuario?.correoVerificadoEn ?? null,
      recordatorios: usuario?.recordatorios?.modo ?? "apagado",
      horaRecordatorios: formatoHora(horaDe(usuario?.recordatorios)),
      diasDeRutina: diasDeRutina({ diasRutina: usuario?.diasRutina, recordatorios: usuario?.recordatorios }).map(
        (d) => DIAS_SEMANA.find((x) => x.valor === d)?.nombre
      ),
    },
    perfilClinico: {
      ...(perfilIlegible && {
        nota: "Una parte del perfil no se pudo leer porque se guardó con otra llave de cifrado.",
      }),
      lesiones: acceso.lesionesPaciente.map((l) => ({
        lesion: nombreLesion(l.slug),
        principal: l.principal,
        estado: l.estado,
        agregadaEn: l.agregadaEn,
      })),
      prescripcion: acceso.prescripcion && {
        archivo: acceso.prescripcion.archivo,
        subidaEn: acceso.prescripcion.subidaEn,
        lesiones: acceso.prescripcion.lesiones.map(nombreLesion),
        ejercicios: acceso.prescripcion.ejercicios.map(nombreEjercicio),
      },
      consentimiento: perfil?.consentimiento ?? null,
    },
    historial: [...dias]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, d]) => ({
        fecha,
        ejerciciosHechos: d.hechos.map((h) => ({ ejercicio: nombreEjercicio(h.ejercicioId), en: h.en })),
        ejerciciosSaltados: d.saltados.map(nombreEjercicio),
        seriesConCamara: d.series.map((s) => ({ ...s, ejercicioId: undefined, ejercicio: nombreEjercicio(s.ejercicioId) })),
        dolorAntes: d.dolorAntes ?? null,
        dolorDespues: d.dolorDespues ?? null,
        suspendidoPorDolor: Boolean(d.suspendido),
      })),
    recordatoriosEnviados: envios,
    encuestas: encuestas
      .filter((e) => !e.omitida)
      .map((e) => ({ semanaDel: e.semana, ...e, semana: undefined })),
  };
}

/**
 * Borra todo lo del paciente. La cuenta va al final: si algo falla antes,
 * sigue existiendo y el paciente puede reintentar, en vez de quedar con
 * datos que ya no podría borrar.
 */
export async function eliminarCuenta(usuarioId: string): Promise<void> {
  const _id = new ObjectId(usuarioId);
  const db = await getDb();
  for (const nombre of COLECCIONES_DEL_USUARIO) {
    await db.collection(nombre).deleteMany({ usuarioId: _id });
  }
  await db.collection("usuarios").deleteOne({ _id });
}

export function avisarCuentaEliminada(nombre: string, correo: string) {
  return enviarCorreo({
    para: correo,
    asunto: "Tu cuenta de KineMotion fue eliminada",
    texto:
      `Hola ${nombre}:\n\n` +
      "Eliminamos tu cuenta de KineMotion y todos sus datos: tu perfil, tus lesiones y tu historial. No volverás a recibir correos nuestros.\n\n" +
      "Si no fuiste tú, otra persona conocía tu contraseña. Puedes crear una cuenta nueva cuando quieras.",
    html:
      `<p>Hola ${escaparHtml(nombre)}:</p>` +
      "<p>Eliminamos tu cuenta de KineMotion y todos sus datos: tu perfil, tus lesiones y tu historial. No volverás a recibir correos nuestros.</p>" +
      "<p>Si no fuiste tú, otra persona conocía tu contraseña. Puedes crear una cuenta nueva cuando quieras.</p>",
  });
}

export function avisarCorreoCambiado(nombre: string, correoAnterior: string, correoNuevo: string) {
  return enviarCorreo({
    para: correoAnterior,
    asunto: "Cambiaste el correo de tu cuenta de KineMotion",
    texto:
      `Hola ${nombre}:\n\n` +
      `El correo de tu cuenta de KineMotion se cambió a ${correoNuevo}. Desde ahora inicias sesión con ese correo.\n\n` +
      "Si no fuiste tú, otra persona conocía tu contraseña: responde a este mensaje para avisarnos.",
    html:
      `<p>Hola ${escaparHtml(nombre)}:</p>` +
      `<p>El correo de tu cuenta de KineMotion se cambió a <strong>${escaparHtml(correoNuevo)}</strong>. Desde ahora inicias sesión con ese correo.</p>` +
      "<p>Si no fuiste tú, otra persona conocía tu contraseña: responde a este mensaje para avisarnos.</p>",
  });
}
