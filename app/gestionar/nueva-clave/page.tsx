import FormAcceso from "@/components/acceso/FormAcceso";

export const dynamic = "force-dynamic";

export default async function NuevaClave({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <main className="acceso">
        <div className="caja">
          <h1>El enlace venció</h1>
          <p>Los enlaces sirven una sola vez y duran 1 hora.</p>
          <p><a className="btn pri" href="/gestionar/recuperar">Pedir uno nuevo</a></p>
        </div>
      </main>
    );
  }
  return <main className="acceso"><FormAcceso modo="nueva" token={token} /></main>;
}
