// Carga en Vercel (producción) las variables de .env.local, sin copiarlas a mano.
// Uso (una vez que `npx vercel login` y `npx vercel link` estén hechos):
//   node scripts/subir-env-vercel.mjs            → todas las variables de abajo
//   node scripts/subir-env-vercel.mjs NOMBRE ...  → solo las indicadas
// No imprime los valores: solo dice qué variable se cargó.
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const TODAS = [
  "MONGODB_URI",
  "MONGODB_DB",
  "ENCRYPTION_KEY",
  "GMAIL_USUARIO",
  "GMAIL_CLAVE_APP",
  "CRON_SECRET",
];
const pedidas = process.argv.slice(2);
const desconocidas = pedidas.filter((n) => !TODAS.includes(n));
if (desconocidas.length) {
  console.log(`ERROR: variables desconocidas: ${desconocidas.join(", ")}`);
  process.exit(1);
}
const NOMBRES = pedidas.length ? pedidas : TODAS;

if (!fs.existsSync(".env.local")) {
  console.log("ERROR: no existe .env.local en esta carpeta.");
  process.exit(1);
}

const env = {};
for (const linea of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const vercel = (args, input) =>
  spawnSync("npx", ["--yes", "vercel", ...args], { input, encoding: "utf8" });

let fallas = 0;
for (const nombre of NOMBRES) {
  const valor = env[nombre];
  if (!valor) {
    console.log(`${nombre}: falta en .env.local, se omite`);
    fallas++;
    continue;
  }
  // Se borra la versión anterior (si no existe, no pasa nada) y se crea de nuevo.
  vercel(["env", "rm", nombre, "production", "--yes"]);
  const r = vercel(["env", "add", nombre, "production"], valor);
  if (r.status === 0) {
    console.log(`${nombre}: cargada en producción`);
  } else {
    fallas++;
    const error = (r.stderr || r.stdout).split("\n").find((l) => /error/i.test(l)) ?? "error desconocido";
    console.log(`${nombre}: NO se pudo cargar → ${error.trim()}`);
  }
}

console.log(fallas ? `\nTerminó con ${fallas} problema(s).` : "\nListo: las variables quedaron cargadas. Avísale a Claude para publicar de nuevo y probar.");
