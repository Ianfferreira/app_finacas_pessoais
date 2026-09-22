import Link from "next/link";
import { CardStatementImportForm } from "./card-statement-import-form";
import { ImportForm } from "./import-form";
import { NubankPdfImportForm } from "./nubank-pdf-import-form";
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
        <NubankPdfImportForm />
      </section>
      <section className="card auth-card">
        <p className="eyebrow">Faturas de cartão</p>
        <h2>Importação guiada de fatura</h2>
        <p className="muted">
          Envie um PDF ou CSV de cartão. O sistema só aceita formatos que
          reconhece explicitamente e mostra uma prévia antes de gravar.
        </p>
        <CardStatementImportForm />
      </section>
    </main>
  );
}
