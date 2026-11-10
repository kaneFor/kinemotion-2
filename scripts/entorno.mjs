// Lo que comparten los scripts: variables de .env.local, conexión a la base
// y el mismo cifrado AES-256-GCM de lib/crypto.ts.
import fs from "node:fs";
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

export const env = { ...leerArchivo(".env.local"), ...process.env };

function leerArchivo(ruta) {
  const valores = {};
  if (!fs.existsSync(ruta)) return valores;
  for (const linea of fs.readFileSync(ruta, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) valores[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return valores;
}

const llave = Buffer.from(env.ENCRYPTION_KEY ?? "", "hex");

export function exigir({ cifrado = false } = {}) {
  if (!env.MONGODB_URI || (cifrado && llave.length !== 32)) {
    console.log(`ERROR: falta${cifrado ? "n MONGODB_URI o ENCRYPTION_KEY" : " MONGODB_URI"} en .env.local.`);
    process.exit(1);
  }
}

export async function conectar() {
  const cliente = new MongoClient(env.MONGODB_URI);
  await cliente.connect();
  const nombre = env.MONGODB_DB || "kinemotion";
  return { cliente, db: cliente.db(nombre), nombre };
}

export function cifrar(valor) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", llave, iv);
  const data = Buffer.concat([c.update(JSON.stringify(valor), "utf8"), c.final()]);
  return { iv: iv.toString("hex"), tag: c.getAuthTag().toString("hex"), data: data.toString("hex") };
}

export const enChile = (fecha) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
