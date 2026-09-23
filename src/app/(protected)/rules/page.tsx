import Link from "next/link";

import { ECONOMIC_NATURE_OPTIONS } from "@/domain/natures";
import { createClient } from "@/lib/supabase/server";

import {
  createClassificationRule,
  deleteClassificationRule,
  toggleClassificationRule,
} from "./actions";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { data: rules }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("kind", "expense")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("classification_rules")
      .select(
        "id, name, description_contains, priority, is_active, categories(name), nature",
      )
      .order("priority"),
  ]);
  return (
    <main className="centered-page">
      <section className="card">
        <Link className="back-link" href="/review">
          ← Revisão
        </Link>
        <p className="eyebrow">Regras</p>
        <h1>Classificação automática editável</h1>
        <p className="muted">
          Regras do usuário têm precedência sobre merchant confirmado, parser e
          sugestões.
        </p>
        {error ? <p className="notice error">{error}</p> : null}
        {success ? <p className="notice success">{success}</p> : null}
        <form action={createClassificationRule} className="stack">
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            Descrição contém
            <input name="descriptionContains" required />
          </label>
          <label>
            Prioridade (menor vence)
            <input
              defaultValue="100"
              min="1"
              name="priority"
              required
              type="number"
            />
          </label>
          <label>
            Categoria
            <select defaultValue="" name="categoryId">
              <option value="">Não alterar</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Natureza
            <select defaultValue="" name="nature">
              <option value="">Não alterar</option>
              {ECONOMIC_NATURE_OPTIONS.filter(
                ({ value }) => value !== "unclassified",
              ).map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary" type="submit">
            Criar regra
          </button>
        </form>
        <ul className="stack">
          {rules?.map((rule) => {
            const category = Array.isArray(rule.categories)
              ? rule.categories[0]
              : rule.categories;
            return (
              <li className="movement" key={rule.id}>
                <strong>{rule.name}</strong>
                <br />
                <span className="muted">
                  “{rule.description_contains}” · prioridade {rule.priority} ·{" "}
                  {category?.name ?? rule.nature ?? "sem saída"}
                </span>
                <form action={toggleClassificationRule}>
                  <input name="ruleId" type="hidden" value={rule.id} />
                  <input
                    name="active"
                    type="hidden"
                    value={String(rule.is_active)}
                  />
                  <button className="button secondary" type="submit">
                    {rule.is_active ? "Desativar" : "Ativar"}
                  </button>
                </form>
                <form action={deleteClassificationRule}>
                  <input name="ruleId" type="hidden" value={rule.id} />
                  <button className="button secondary" type="submit">
                    Excluir
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
