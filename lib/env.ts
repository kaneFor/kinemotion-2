/**
 * Lee una variable de entorno tolerando errores típicos al pegarla en el
 * panel de Vercel:
 *  - espacios o saltos de línea sobrantes
 *  - comillas alrededor del valor
 *  - la línea completa del .env pegada como valor ("NOMBRE=valor")
 *  - TODO el .env pegado como valor de una sola variable (varias líneas):
 *    se toma la línea "NOMBRE=..." que corresponde
 */
export function leerEnv(nombre: string): string | undefined {
  const crudo = process.env[nombre];
  if (crudo === undefined) return undefined;

  const lineas = crudo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const propia = lineas.find((l) => l.startsWith(`${nombre}=`));
  let v = propia ?? (lineas.length === 1 ? lineas[0] : lineas.find((l) => !/^[A-Z_]+=/.test(l)) ?? "");

  if (v.startsWith(`${nombre}=`)) v = v.slice(nombre.length + 1).trim();
  v = v.replace(/^["']|["']$/g, "").trim();
  return v || undefined;
}
