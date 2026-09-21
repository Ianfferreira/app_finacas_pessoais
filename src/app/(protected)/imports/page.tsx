import Link from "next/link";
import { ImportForm } from "./import-form";
export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="centered-page">
      <section className="card auth-card">
        <Link className="back-link" href="/dashboard">
          ← Perfil
        </Link>
        <p className="eyebrow">Importações</p>
        <h1>Extrato Nubank CSV</h1>
        <p className="muted">
          Envie um CSV Nubank. Antes do primeiro envio, a conta editável “Conta
          Nubank” será criada automaticamente.
        </p>
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        <ImportForm />
      </section>
    </main>
  );
}
