"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="centered-page">
      <section className="card auth-card" role="alert">
        <p className="eyebrow">Não foi possível continuar</p>
        <h1>O perfil não pôde ser carregado.</h1>
        <p className="muted">
          Verifique a conexão com o Supabase e tente novamente.
        </p>
        <button className="button primary" onClick={reset} type="button">
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
