import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FormLogin from "@/components/FormLogin";
import { obtenerUsuario } from "@/lib/sesion";

export default async function Login() {
  const usuario = await obtenerUsuario();
  if (usuario) redirect(usuario.admin ? "/admin" : "/biblioteca");

  return (
    <>
      <Nav />
      <main className="flex-1">
        <FormLogin />
      </main>
      <Footer />
    </>
  );
}
