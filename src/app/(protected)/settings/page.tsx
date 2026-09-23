import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import {
  createAccount,
  createCard,
  createCategory,
  createPerson,
  deactivateSetting,
} from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const [
    { data: people },
    { data: accounts },
    { data: cards },
    { data: categories },
    { data: institutions },
  ] = await Promise.all([
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
    supabase
      .from("categories")
      .select("id, name, kind")
      .eq("is_active", true)
      .order("kind")
      .order("sort_order"),
    supabase
      .from("institutions")
      .select("id, name")
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
              <form action={deactivateSetting}>
                <input name="table" type="hidden" value="people" />
                <input name="id" type="hidden" value={person.id} />
                <button className="button secondary" type="submit">
                  Desativar
                </button>
              </form>
            </li>
          ))}
        </ul>
        <h2>Categorias</h2>
        <form action={createCategory} className="stack">
          <label>
            Nome da categoria
            <input name="name" required />
          </label>
          <label>
            Tipo
            <select defaultValue="expense" name="kind">
              <option value="expense">Gasto</option>
              <option value="income">Receita</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Adicionar categoria
          </button>
        </form>
        <ul>
          {categories?.map((category) => (
            <li key={category.id}>
              {category.name} ·{" "}
              {category.kind === "expense" ? "gasto" : "receita"}
              <form action={deactivateSetting}>
                <input name="table" type="hidden" value="categories" />
                <input name="id" type="hidden" value={category.id} />
                <button className="button secondary" type="submit">
                  Desativar
                </button>
              </form>
            </li>
          ))}
        </ul>
        <h2>Contas ativas</h2>
        <form action={createAccount} className="stack">
          <label>
            Nome da conta
            <input name="name" required />
          </label>
          <label>
            Instituição
            <select defaultValue="" name="institutionId" required>
              <option disabled value="">
                Selecione
              </option>
              {institutions?.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select defaultValue="checking" name="type">
              <option value="checking">Corrente</option>
              <option value="savings">Poupança</option>
              <option value="payment">Pagamento</option>
              <option value="cash">Dinheiro</option>
              <option value="investment">Investimento</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Adicionar conta
          </button>
        </form>
        <ul>
          {accounts?.map((account) => {
            const institution = Array.isArray(account.institutions)
              ? account.institutions[0]
              : account.institutions;
            return (
              <li key={account.id}>
                {account.name} · {institution?.name}
                <form action={deactivateSetting}>
                  <input name="table" type="hidden" value="accounts" />
                  <input name="id" type="hidden" value={account.id} />
                  <button className="button secondary" type="submit">
                    Desativar
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        <h2>Cartões ativos</h2>
        <form action={createCard} className="stack">
          <label>
            Nome do cartão
            <input name="name" required />
          </label>
          <label>
            Instituição
            <select defaultValue="" name="institutionId" required>
              <option disabled value="">
                Selecione
              </option>
              {institutions?.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Últimos quatro dígitos (opcional)
            <input
              inputMode="numeric"
              maxLength={4}
              name="lastFour"
              pattern="[0-9]{4}"
            />
          </label>
          <label>
            Conta de pagamento (opcional)
            <select defaultValue="" name="billingAccountId">
              <option value="">Não associar</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary" type="submit">
            Adicionar cartão
          </button>
        </form>
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
                <form action={deactivateSetting}>
                  <input name="table" type="hidden" value="cards" />
                  <input name="id" type="hidden" value={card.id} />
                  <button className="button secondary" type="submit">
                    Desativar
                  </button>
                </form>
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
          </Link>{" "}
          <Link className="button secondary" href="/api/export?format=zip">
            Baixar ZIP estruturado
          </Link>
        </p>
      </section>
    </main>
  );
}
