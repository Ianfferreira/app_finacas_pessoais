import Link from "next/link";

import { ECONOMIC_NATURE_OPTIONS } from "@/domain/natures";
import { TerraPage } from "@/features/ui/terra-page";
import { createClient } from "@/lib/supabase/server";

import {
  reprocessReviewTransaction,
  resolveCategoryReview,
  resolveNatureReview,
} from "./actions";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const [{ data: items }, { data: categories }] = await Promise.all([
    supabase
      .from("review_items")
      .select(
        "id, transaction_id, type, detail, transactions(id, description_raw, amount, occurred_on, nature)",
      )
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("kind", "expense")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  return (
    <TerraPage current="/review">
      <section className="card">
        <Link className="back-link" href="/movements">
          ← Movimentações
        </Link>
        <p className="eyebrow">Revisão</p>
        <h1>Pendências independentes</h1>
        <Link className="button secondary" href="/rules">
          Gerenciar regras
        </Link>
        <p className="muted">
          Categoria, natureza, competência, conciliação e possível duplicidade
          são revisadas separadamente. Uma decisão manual fica protegida.
        </p>
        {error ? <p className="notice error">{error}</p> : null}
        {success ? <p className="notice success">{success}</p> : null}
        {!items?.length ? (
          <p className="muted">Não há pendências abertas.</p>
        ) : (
          <ul className="stack">
            {items.map((item) => {
              const transaction = Array.isArray(item.transactions)
                ? item.transactions[0]
                : item.transactions;
              if (!transaction) return null;
              return (
                <li className="movement" key={item.id}>
                  <strong>{transaction.description_raw}</strong>
                  <br />
                  <span className="muted">
                    {item.type} · {transaction.occurred_on ?? "Sem data"} · R${" "}
                    {transaction.amount}
                  </span>
                  {item.type === "category" ? (
                    <form
                      action={resolveCategoryReview}
                      className="movement-nature"
                    >
                      <input name="reviewId" type="hidden" value={item.id} />
                      <input
                        name="transactionId"
                        type="hidden"
                        value={transaction.id}
                      />
                      <label>
                        Categoria
                        <select defaultValue="" name="categoryId" required>
                          <option disabled value="">
                            Selecione
                          </option>
                          {categories?.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="button secondary" type="submit">
                        Salvar categoria
                      </button>
                    </form>
                  ) : item.type === "nature" ? (
                    <form
                      action={resolveNatureReview}
                      className="movement-nature"
                    >
                      <input name="reviewId" type="hidden" value={item.id} />
                      <input
                        name="transactionId"
                        type="hidden"
                        value={transaction.id}
                      />
                      <label>
                        Natureza
                        <select defaultValue={transaction.nature} name="nature">
                          {ECONOMIC_NATURE_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="button secondary" type="submit">
                        Salvar natureza
                      </button>
                    </form>
                  ) : null}
                  <form action={reprocessReviewTransaction}>
                    <input
                      name="transactionId"
                      type="hidden"
                      value={transaction.id}
                    />
                    <button className="button secondary" type="submit">
                      Reprocessar regras
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </TerraPage>
  );
}
