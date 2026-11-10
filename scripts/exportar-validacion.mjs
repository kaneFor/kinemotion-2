// Exporta, anonimizados, los datos de la validación: cumplimiento
// autodeclarado semanal y encuestas de utilidad percibida.
// Uso:
//   npm run exportar-validacion
//   npm run exportar-validacion -- --excluir correo1@x.cl,correo2@x.cl
// Escribe CSV en validacion/<fecha>/ (carpeta ignorada por git) e imprime un
// resumen. Cada participante recibe un código al azar (P01, P02…); nunca se
// exportan nombres ni correos. Ojo: los comentarios son texto libre y
// podrían incluir datos que identifiquen a alguien; revísalos antes de
// compartirlos.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MongoClient } from "mongodb";
import { cumplimientoSemana, diasDeRutina, lunesDe, sumarDias } from "../lib/progreso.ts";

const env = {};
for (const linea of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const llave = Buffer.from(env.ENCRYPTION_KEY ?? "", "hex");
if (!env.MONGODB_URI || llave.length !== 32) {
  console.log("ERROR: faltan MONGODB_URI o ENCRYPTION_KEY en .env.local.");
  process.exit(1);
}

const i = process.argv.indexOf("--excluir");
const excluidos = new Set(
  (i >= 0 ? process.argv[i + 1] ?? "" : "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean)
);

function descifrar(campo) {
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", llave, Buffer.from(campo.iv, "hex"));
    d.setAuthTag(Buffer.from(campo.tag, "hex"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(campo.data, "hex")), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

const enChile = (fecha) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
const promedio = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
const csv = (filas) =>
  filas.map((f) => f.map((v) => (v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`)).join(",")).join("\n") + "\n";

const cliente = new MongoClient(env.MONGODB_URI);
await cliente.connect();
const db = cliente.db(process.env.MONGODB_DB || env.MONGODB_DB || "kinemotion");
const hoy = enChile(new Date());

// Sin administradores ni cuentas de demostración: no son participantes.
const usuarios = (await db.collection("usuarios").find({ rol: { $ne: "admin" }, demo: { $ne: true } }, { projection: { correo: 1, creadoEn: 1, diasRutina: 1, recordatorios: 1 } }).toArray())
  .filter((u) => !excluidos.has(String(u.correo).toLowerCase()));
// Códigos en orden aleatorio, para que no reflejen el orden de registro.
usuarios.sort(() => Math.random() - 0.5);

const filasParticipantes = [["codigo", "semanas_con_sesiones", "cumplimiento_promedio_pct", "encuestas_respondidas", "utilidad_promedio"]];
const filasSemanas = [["codigo", "semana_del", "programadas", "completadas", "suspendidas_por_dolor", "cumplimiento_pct"]];
const filasEncuestas = [["codigo", "semana_del", "utilidad", "claridad", "dificultad", "comentario"]];
const todas = { cumplimiento: [], utilidad: [], claridad: [], dificultad: [] };

usuarios.forEach((u, n) => {
  u.codigo = `P${String(n + 1).padStart(2, "0")}`;
});

for (const u of usuarios) {
  const desde = u.creadoEn instanceof Date ? enChile(u.creadoEn) : hoy;
  const dias = new Map();
  for (const d of await db.collection("historial_progreso").find({ usuarioId: u._id }).toArray()) {
    const dia = descifrar(d.datos);
    if (dia) dias.set(d.fecha, { hechos: [], saltados: [], series: [], ...dia });
  }

  const rutina = diasDeRutina(u);
  const porcentajes = [];
  for (let lunes = lunesDe(desde); lunes <= hoy; lunes = sumarDias(lunes, 7)) {
    const s = cumplimientoSemana(dias, rutina, lunes, hoy, desde);
    if (s.porcentaje === null) continue;
    porcentajes.push(s.porcentaje);
    filasSemanas.push([u.codigo, lunes, s.programadas, s.completadas, s.suspendidas, s.porcentaje]);
  }

  const encuestas = (await db.collection("encuestas").find({ usuarioId: u._id }).sort({ semana: 1 }).toArray())
    .map((e) => ({ semana: e.semana, ...descifrar(e.datos) }))
    .filter((e) => e.utilidad);
  for (const e of encuestas) {
    filasEncuestas.push([u.codigo, e.semana, e.utilidad, e.claridad, e.dificultad, e.comentario ?? ""]);
    todas.utilidad.push(e.utilidad);
    todas.claridad.push(e.claridad);
    todas.dificultad.push(e.dificultad);
  }

  const cumplimiento = promedio(porcentajes);
  if (cumplimiento !== null) todas.cumplimiento.push(cumplimiento);
  filasParticipantes.push([u.codigo, porcentajes.length, cumplimiento, encuestas.length, promedio(encuestas.map((e) => e.utilidad))]);
}
await cliente.close();

const carpeta = path.join("validacion", hoy);
fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(path.join(carpeta, "participantes.csv"), csv(filasParticipantes));
fs.writeFileSync(path.join(carpeta, "cumplimiento_semanal.csv"), csv(filasSemanas));
fs.writeFileSync(path.join(carpeta, "encuestas.csv"), csv(filasEncuestas));

const utilidad = promedio(todas.utilidad);
console.log(`Participantes: ${usuarios.length}${excluidos.size ? ` (excluidas ${excluidos.size} cuentas)` : ""}`);
console.log(`Cumplimiento autodeclarado promedio: ${promedio(todas.cumplimiento) ?? "—"} %`);
console.log(`Encuestas respondidas: ${todas.utilidad.length}`);
console.log(`Utilidad percibida promedio: ${utilidad ?? "—"} / 5 (meta del proyecto: ≥ 4) ${utilidad === null ? "" : utilidad >= 4 ? "→ cumple" : "→ no cumple"}`);
console.log(`Claridad promedio: ${promedio(todas.claridad) ?? "—"} / 5 · Dificultad promedio: ${promedio(todas.dificultad) ?? "—"} / 5`);
console.log(`\nArchivos en ${carpeta}/ (revisa los comentarios antes de compartirlos).`);
