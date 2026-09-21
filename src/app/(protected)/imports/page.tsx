import Link from "next/link";
import { importNubankCsv } from "./actions";
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
        <form className="stack" action={importNubankCsv}>
          <label>
            Arquivo CSV
            <input accept=".csv,text/csv" name="file" required type="file" />
          </label>
          <button className="button primary" type="submit">
            Importar e confirmar
          </button>
        </form>
      </section>
    </main>
  );
}
