import crypto from "crypto";
import { leerEnv } from "@/lib/env";

/**
 * Cifrado simétrico AES-256-GCM para los campos sensibles del perfil
 * clínico (tipo de lesión, notas, historial), conforme al Artículo 10°
 * de la Ley N° 19.628 sobre Protección de la Vida Privada.
 *
 * La llave NUNCA vive en el código ni en el repositorio: se lee desde la
 * variable de entorno ENCRYPTION_KEY (32 bytes = 64 caracteres hex).
 * Genera una nueva con:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

function getKey(): Buffer {
  const hex = leerEnv("ENCRYPTION_KEY");
  if (!hex) {
    throw new Error(
      "Falta la variable de entorno ENCRYPTION_KEY (32 bytes en hex)."
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY debe tener 32 bytes (64 caracteres hex). Genera una con: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return key;
}

export type CampoCifrado = {
  iv: string;
  tag: string;
  data: string;
};

export function cifrar(texto: string): CampoCifrado {
  const iv = crypto.randomBytes(12); // recomendado para GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: data.toString("hex"),
  };
}

export function descifrar(campo: CampoCifrado): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(campo.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(campo.tag, "hex"));
  const data = Buffer.concat([
    decipher.update(Buffer.from(campo.data, "hex")),
    decipher.final(),
  ]);
  return data.toString("utf8");
}
