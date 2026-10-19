/**
 * Pista legible de la causa probable de un error de base de datos o
 * configuración. Solo se muestra en desarrollo; en producción no se exponen
 * detalles internos.
 */
export function pistaDeError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("mongodb_uri")) {
    return "Falta MONGODB_URI en .env.local. Reinicia npm run dev después de editarlo.";
  }
  if (msg.includes("encryption_key")) {
    return "ENCRYPTION_KEY falta o no tiene 64 caracteres hexadecimales.";
  }
  if (msg.includes("bad auth") || msg.includes("authentication failed")) {
    return "Atlas rechazó el usuario o la contraseña. Revisa MONGODB_URI (sin <>, y sin símbolos especiales en la contraseña).";
  }
  if (msg.includes("not authorized") || msg.includes("requires authentication")) {
    return "El usuario de Atlas no tiene permiso de lectura y escritura.";
  }
  if (msg.includes("querysrv") || msg.includes("enotfound") || msg.includes("getaddrinfo")) {
    return "No se pudo resolver el servidor de Atlas. Revisa el nombre del cluster en la URI, tu conexión o tu VPN.";
  }
  if (msg.includes("server selection") || msg.includes("timed out") || msg.includes("timeout")) {
    return "No se alcanzó el cluster. Lo más probable es que tu IP no esté permitida en Atlas (Network Access) o que tu red bloquee la conexión.";
  }
  if (msg.includes("invalid scheme") || msg.includes("invalid connection string")) {
    return "MONGODB_URI tiene un formato inválido. Debe empezar con mongodb+srv://";
  }
  return "Revisa el detalle del error en la terminal donde corre npm run dev.";
}
