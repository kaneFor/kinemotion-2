import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FormRegistro from "@/components/FormRegistro";
import { obtenerUsuario } from "@/lib/sesion";

export default async function Registro() {
  if (await obtenerUsuario()) redirect("/biblioteca");

  return (
    <>
      <Nav />
      <main className="flex-1">
        <FormRegistro />
      </main>
      <Footer />
    </>
  );
}
