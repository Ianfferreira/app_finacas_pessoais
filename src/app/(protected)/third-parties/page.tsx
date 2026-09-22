import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { recordThirdPartyEntry } from "./actions";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ThirdPartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const [{ data: people }, { data: entries }] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("third_party_entries")
      .select(
        "id, person_id, amount, kind, occurred_on, note, people(full_name)",
      )
      .order("occurred_on", { ascending: false })
      .limit(200),
  ]);
  const balances = new Map<string, { name: string; amount: number }>();
  for (const entry of entries ?? []) {
    const person = Array.isArray(entry.people) ? entry.people[0] : entry.people;
    const current = balances.get(entry.person_id) ?? {
      name: person?.full_name ?? "Pessoa",
      amount: 0,
    };
    current.amount += entry.amount;
    balances.set(entry.person_id, current);
  }
  return (
    <main className="centered-page">
      <section className="card">
        <Link className="back-link" href="/dashboard">
          ← Visão geral
        </Link>
        <p className="eyebrow">Terceiros</p>
        <h1>Razão de reembolsos e créditos</h1>
        <p className="muted">
          Valor positivo significa “a receber”; negativo representa crédito/a
          pagar. Reembolso parcial é apenas um novo lançamento negativo.
        </p>
        {error ? <p className="notice error">{error}</p> : null}
        {success ? <p className="notice success">{success}</p> : null}
        <form className="stack" action={recordThirdPartyEntry}>
          <label>
            Pessoa
            <select name="personId" required defaultValue="">
              <option disabled value="">
                Selecione
              </option>
              {people?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="kind" defaultValue="charge">
              <option value="charge">Despesa compartilhada / a receber</option>
              <option value="reimbursement">Reembolso / crédito</option>
            </select>
          </label>
          <label>
            Valor
            <input
              name="amount"
              required
              min="0.01"
              step="0.01"
              type="number"
            />
          </label>
          <label>
            Observação
            <input name="note" />
          </label>
          <button className="button primary" type="submit">
            Registrar
          </button>
        </form>
        <h2>Saldos</h2>
        <ul>
          {[...balances.entries()].map(([id, balance]) => (
            <li key={id}>
              <strong>{balance.name}</strong>: {money.format(balance.amount)}
            </li>
          ))}
        </ul>
        <h2>Razão</h2>
        <ul className="stack">
          {entries?.map((entry) => {
            const person = Array.isArray(entry.people)
              ? entry.people[0]
              : entry.people;
            return (
              <li className="movement" key={entry.id}>
                <strong>{person?.full_name}</strong>
                <br />
                <span className="muted">
                  {entry.occurred_on} · {entry.kind} ·{" "}
                  {money.format(entry.amount)}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
