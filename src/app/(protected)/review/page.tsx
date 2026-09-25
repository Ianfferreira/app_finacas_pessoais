import Link from "next/link";

import { ECONOMIC_NATURE_OPTIONS } from "@/domain/natures";
import { TerraPage } from "@/features/ui/terra-page";
import { OwnershipForm } from "@/features/review/ownership-form";
import { createClient } from "@/lib/supabase/server";

import {
  confirmPossibleDuplicateCandidate,
  dismissPossibleDuplicateCandidate,
  reprocessReviewTransaction,
  resolveCategoryReview,
  resolveNatureReview,
  setTransactionOwnership,
} from "./actions";

function fingerprintDetails(fingerprint: unknown) {
  if (
    !fingerprint ||
    typeof fingerprint !== "object" ||
    Array.isArray(fingerprint)
  ) {
    return [];
  }
  return Object.entries(fingerprint).filter(([, value]) =>
    ["string", "number", "boolean"].includes(typeof value),
  );
}

function categoryKindForNature(nature: string) {
  if (nature === "expense" || nature === "reversal") return "expense";
  if (nature === "income" || nature === "investment_income") return "income";
  return null;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const [
    { data: items },
    { data: categories },
    { data: people },
    { data: candidates },
  ] = await Promise.all([
    supabase
      .from("review_items")
      .select(
        "id, transaction_id, type, detail, transactions(id, description_raw, amount, occurred_on, nature)",
      )
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, kind")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("people")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("possible_duplicate_candidates")
      .select("id, transaction_id, candidate_transaction_id, fingerprint")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);
  const duplicateTransactionIds = [
    ...new Set(
      (candidates ?? []).flatMap((candidate) => [
        candidate.transaction_id,
        candidate.candidate_transaction_id,
      ]),
    ),
  ];
  const { data: duplicateTransactions } = duplicateTransactionIds.length
    ? await supabase
        .from("transactions")
        .select("id, occurred_on, description_raw, amount, competence_month")
        .in("id", duplicateTransactionIds)
    : { data: [] };
  const duplicatesByTransaction = new Map(
    (duplicateTransactions ?? []).map((transaction) => [
      transaction.id,
      transaction,
    ]),
  );
  return (
    <TerraPage current="/review">
      <section className="card">
        <Link className="back-link" href="/movements">
          ← Movimentações
        </Link>
        <p className="eyebrow">Revisão</p>
        <h1>Revisão pendente</h1>
        <Link className="button secondary" href="/rules">
          Gerenciar regras
        </Link>
        <p className="muted">
          Aqui entram apenas decisões que dependem de você. Categoria, natureza,
          titularidade, competência, conciliação e duplicidade são tratadas
          separadamente, sem alterar o dado importado.
        </p>
        {error ? <p className="notice error">{error}</p> : null}
        {success ? <p className="notice success">{success}</p> : null}
        {!items?.length ? (
          <section className="terra-empty-flow terra-review-empty">
            <p className="eyebrow">Tudo em dia</p>
            <h2>Não há decisões aguardando você</h2>
            <p>
              “100% minha”, “Outra pessoa” e “Dividir” aparecem ao abrir os
              detalhes de uma despesa ou estorno que precise de titularidade.
              Entradas, como Pix recebidos, não usam rateio de despesas.
            </p>
            <div className="terra-empty-steps">
              <span>1. Abra Movimentações</span>
              <span>2. Escolha um gasto</span>
              <span>3. Defina a titularidade no detalhe</span>
            </div>
            <Link className="button primary" href="/movements">
              Ir para movimentações
            </Link>
          </section>
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
                          {categories
                            ?.filter(
                              (category) =>
                                category.kind ===
                                categoryKindForNature(transaction.nature),
                            )
                            .map((category) => (
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
                  ) : item.type === "ownership" ? (
                    <OwnershipForm
                      action={setTransactionOwnership}
                      people={people ?? []}
                      transactionAmount={transaction.amount}
                      transactionId={transaction.id}
                    />
                  ) : item.type === "reconciliation" ? (
                    <Link className="button secondary" href="/movements">
                      Abrir conciliação em Movimentações
                    </Link>
                  ) : null}
                  {item.type !== "possible_duplicate" ? (
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
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <section
          className="terra-duplicate-review"
          aria-labelledby="duplicate-heading"
        >
          <h2 id="duplicate-heading">Possíveis duplicidades</h2>
          <p className="muted">
            Pares vindos de arquivos distintos com fingerprint compatível. Nada
            é mesclado, apagado ou confirmado automaticamente.
          </p>
          {!candidates?.length ? (
            <p className="terra-empty-state">
              Não há pares pendentes para comparar.
            </p>
          ) : (
            <ul className="stack">
              {candidates.map((candidate) => {
                const original = duplicatesByTransaction.get(
                  candidate.transaction_id,
                );
                const comparison = duplicatesByTransaction.get(
                  candidate.candidate_transaction_id,
                );
                if (!original || !comparison) return null;
                const shared = fingerprintDetails(candidate.fingerprint);
                return (
                  <li
                    className="movement terra-duplicate-pair"
                    key={candidate.id}
                  >
                    <div className="terra-duplicate-columns">
                      <div>
                        <span className="eyebrow">Movimentação A</span>
                        <strong>{original.description_raw}</strong>
                        <span className="muted">
                          {original.occurred_on ?? "Sem data"} · R${" "}
                          {original.amount.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="eyebrow">Movimentação B</span>
                        <strong>{comparison.description_raw}</strong>
                        <span className="muted">
                          {comparison.occurred_on ?? "Sem data"} · R${" "}
                          {comparison.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {shared.length ? (
                      <dl className="terra-fingerprint-list">
                        {shared.map(([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <details className="terra-duplicate-decision">
                      <summary>Resolver esta possível duplicidade</summary>
                      <p>
                        Confirme somente depois de comparar os dois registros. A
                        confirmação mantém um registro canônico e marca o outro
                        como duplicado, sem apagar o arquivo de origem.
                      </p>
                      <div className="terra-duplicate-actions">
                        <form action={confirmPossibleDuplicateCandidate}>
                          <input
                            name="candidateId"
                            type="hidden"
                            value={candidate.id}
                          />
                          <input
                            name="canonicalTransactionId"
                            type="hidden"
                            value={original.id}
                          />
                          <label className="terra-confirmation-check">
                            <input required type="checkbox" />
                            <span>Manter A e marcar B como duplicada.</span>
                          </label>
                          <button className="button primary" type="submit">
                            Confirmar duplicidade
                          </button>
                        </form>
                        <form action={confirmPossibleDuplicateCandidate}>
                          <input
                            name="candidateId"
                            type="hidden"
                            value={candidate.id}
                          />
                          <input
                            name="canonicalTransactionId"
                            type="hidden"
                            value={comparison.id}
                          />
                          <label className="terra-confirmation-check">
                            <input required type="checkbox" />
                            <span>Manter B e marcar A como duplicada.</span>
                          </label>
                          <button className="button primary" type="submit">
                            Confirmar duplicidade
                          </button>
                        </form>
                        <form action={dismissPossibleDuplicateCandidate}>
                          <input
                            name="candidateId"
                            type="hidden"
                            value={candidate.id}
                          />
                          <button className="button secondary" type="submit">
                            Não são duplicadas
                          </button>
                        </form>
                      </div>
                    </details>
                    <Link
                      className="button secondary"
                      href={`/movements?month=${original.competence_month.slice(0, 7)}`}
                    >
                      Ver movimentações do mês
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    </TerraPage>
  );
}
