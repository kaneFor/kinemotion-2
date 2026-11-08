import Link from "next/link";
import { obtenerUsuario } from "@/lib/sesion";
import BotonCerrarSesion from "@/components/BotonCerrarSesion";

export default async function Nav() {
  const usuario = await obtenerUsuario();

  return (
    <header className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-display text-lg text-ink">
          KineMotion
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
          <Link href="/biblioteca" className="hover:text-ink transition-colors">
            {usuario ? "Mi rutina" : "Biblioteca de ejercicios"}
          </Link>
          {usuario ? (
            <>
              <Link href="/progreso" className="hover:text-ink transition-colors">
                Mi progreso
              </Link>
              <Link href="/prescripcion" className="hover:text-ink transition-colors">
                Mi prescripción
              </Link>
            </>
          ) : (
            <>
              <Link href="/#para-quien" className="hover:text-ink transition-colors">
                Para quién
              </Link>
              <Link href="/#como-funciona" className="hover:text-ink transition-colors">
                Cómo funciona
              </Link>
              <Link href="/#lesiones" className="hover:text-ink transition-colors">
                Lesiones cubiertas
              </Link>
            </>
          )}
        </nav>
        {usuario ? (
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-ink-soft">
              Hola, {usuario.nombre.split(" ")[0]}
            </span>
            <Link href="/cuenta" className="text-sm text-ink-soft hover:text-ink transition-colors">
              Mi cuenta
            </Link>
            <BotonCerrarSesion />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-soft hover:text-ink transition-colors">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="text-sm font-medium bg-ink text-paper px-4 py-2 rounded-sm hover:bg-teal-deep transition-colors"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
