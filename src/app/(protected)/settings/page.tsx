import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { createPerson } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const [{ data: people }, { data: accounts }, { data: cards }] =
    await Promise.all([
      supabase
        .from("people")
        .select("id, full_name, relationship")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("accounts")
        .select("id, name, institutions(name)")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cards")
        .select("id, name, last_four, institutions(name)")
        .eq("is_active", true)
        .order("name"),
    ]);
  return (
    <main className="centered-page">
      <section className="card">
        <Link className="back-link" href="/dashboard">
          ← Visão geral
        </Link>
        <p className="eyebrow">Configurações</p>
        <h1>Pessoas, contas e cartões</h1>
        {error ? <p className="notice error">{error}</p> : null}
        {success ? <p className="notice success">{success}</p> : null}
        <form action={createPerson} className="stack">
          <label>
            Nome da pessoa
            <input name="fullName" required />
          </label>
          <label>
            Relação (opcional)
            <input name="relationship" />
          </label>
          <button className="button primary" type="submit">
            Adicionar pessoa
          </button>
        </form>
        <h2>Pessoas</h2>
        <ul>
          {people?.map((person) => (
            <li key={person.id}>
              {person.full_name}
              {person.relationship ? ` · ${person.relationship}` : ""}
            </li>
          ))}
        </ul>
        <h2>Contas ativas</h2>
        <ul>
          {accounts?.map((account) => {
            const institution = Array.isArray(account.institutions)
              ? account.institutions[0]
              : account.institutions;
            return (
              <li key={account.id}>
                {account.name} · {institution?.name}
              </li>
            );
          })}
        </ul>
        <h2>Cartões ativos</h2>
        <ul>
          {cards?.map((card) => {
            const institution = Array.isArray(card.institutions)
              ? card.institutions[0]
              : card.institutions;
            return (
              <li key={card.id}>
                {card.name}
                {card.last_four ? ` •••• ${card.last_four}` : ""} ·{" "}
                {institution?.name}
              </li>
            );
          })}
        </ul>
        <h2>Exportação manual</h2>
        <p className="muted">
          A exportação inclui dados estruturados, mas nunca os arquivos privados
          originais nem evidências brutas.
        </p>
        <p>
          <Link className="button secondary" href="/api/export?format=json">
            Baixar JSON
          </Link>{" "}
          <Link className="button secondary" href="/api/export?format=csv">
            Baixar CSV de movimentações
          </Link>
        </p>
      </section>
    </main>
  );
}
