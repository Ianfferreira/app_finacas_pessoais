import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { TerraPage } from "@/features/ui/terra-page";
import { SettlementForm } from "@/features/third-parties/settlement-form";

import { recordThirdPartyEntry, recordThirdPartySettlement } from "./actions";

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
  const [{ data: people }, { data: entries }, { data: settlementAllocations }] =
    await Promise.all([
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
      supabase
        .from("settlement_allocations")
        .select("third_party_entry_id, amount"),
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
  const settledByEntry = new Map<string, number>();
  for (const allocation of settlementAllocations ?? []) {
    settledByEntry.set(
      allocation.third_party_entry_id,
      (settledByEntry.get(allocation.third_party_entry_id) ?? 0) +
        allocation.amount,
    );
  }
  const openEntriesByPerson = new Map<
    string,
    { id: string; label: string; openAmount: number }[]
  >();
  for (const entry of entries ?? []) {
    if (
      (entry.kind !== "charge" && entry.kind !== "adjustment") ||
      entry.amount <= 0
    ) {
      continue;
    }
    const openAmount = entry.amount - (settledByEntry.get(entry.id) ?? 0);
    if (openAmount <= 0) continue;
    const current = openEntriesByPerson.get(entry.person_id) ?? [];
    current.push({
      id: entry.id,
      label: `${entry.occurred_on} · ${entry.note ?? "Cobrança sem observação"}`,
      openAmount,
    });
    openEntriesByPerson.set(entry.person_id, current);
  }
  return (
    <TerraPage current="/third-parties">
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
        <section
          className="terra-settlement-section"
          aria-labelledby="settlement-heading"
        >
          <h2 id="settlement-heading">Liquidações pendentes</h2>
          <p className="muted">
            Um PIX ou reembolso só baixa as cobranças escolhidas explicitamente.
            Qualquer excedente exige classificação separada.
          </p>
          {!openEntriesByPerson.size ? (
            <p className="terra-empty-state">
              Não há cobranças abertas para liquidar.
            </p>
          ) : (
            <div className="terra-settlement-grid">
              {[...openEntriesByPerson.entries()].map(
                ([personId, openEntries]) => {
                  const balance = balances.get(personId);
                  return (
                    <article className="terra-settlement-card" key={personId}>
                      <h3>{balance?.name ?? "Pessoa"}</h3>
                      <p className="muted">
                        Em aberto:{" "}
                        {money.format(
                          openEntries.reduce(
                            (total, entry) => total + entry.openAmount,
                            0,
                          ),
                        )}
                      </p>
                      <SettlementForm
                        action={recordThirdPartySettlement}
                        entries={openEntries}
                        personId={personId}
                        personName={balance?.name ?? "esta pessoa"}
                      />
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </section>
    </TerraPage>
  );
}
