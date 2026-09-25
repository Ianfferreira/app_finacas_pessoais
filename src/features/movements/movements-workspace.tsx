"use client";

import { useMemo, useState } from "react";

import { ECONOMIC_NATURE_OPTIONS, economicNatureLabel } from "@/domain/natures";
import type { EconomicNature } from "@/domain/metrics";
import {
  TRANSACTION_LINK_TYPE_OPTIONS,
  type TransactionLinkType,
} from "@/domain/transaction-links";
import { OwnershipForm } from "@/features/review/ownership-form";

type Person = { id: string; full_name: string };

type Allocation = {
  ownerType: "self" | "third_party";
  personId?: string;
  amount: number;
  percentage: number | null;
};

export type MovementRow = {
  id: string;
  occurredOn: string | null;
  description: string;
  amount: number;
  direction: "inflow" | "outflow" | "neutral";
  nature: EconomicNature;
  category: string | null;
  competenceMonth: string;
  accountOrCard: string | null;
  sourceFile: string | null;
  parser: string | null;
  natureSource: string;
  ownershipSource: string;
  allocations: Allocation[];
};

export type ReconciliationCandidate = {
  id: string;
  fromTransactionId: string;
  toTransactionId: string;
  linkType: Extract<TransactionLinkType, "own_transfer_pair" | "reversal_of">;
  amount: number;
  evidenceFields: string[];
};

export type CardStatement = {
  id: string;
  cardName: string | null;
  cycleEnd: string | null;
  dueOn: string | null;
  totalDue: number | null;
  allocatedAmount: number;
};

export type CardPaymentAllocation = {
  id: string;
  paymentTransactionId: string;
  statementId: string;
  amount: number;
};

type MovementActions = {
  setNature: (formData: FormData) => void | Promise<void>;
  setOwnership: (formData: FormData) => void | Promise<void>;
  createLink: (formData: FormData) => void | Promise<void>;
  dismissCandidate: (formData: FormData) => void | Promise<void>;
  allocateCardPayment: (formData: FormData) => void | Promise<void>;
  removeCardPaymentAllocation: (formData: FormData) => void | Promise<void>;
};

type Tab =
  "all" | "expense" | "income" | "third_party" | "transfer" | "investment";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "expense", label: "Gastos" },
  { id: "income", label: "Receitas" },
  { id: "third_party", label: "Terceiros" },
  { id: "transfer", label: "Transferências" },
  { id: "investment", label: "Investimentos" },
];

function matchesTab(row: MovementRow, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "transfer") return row.nature === "own_transfer";
  if (tab === "investment") {
    return row.nature === "investment" || row.nature === "redemption";
  }
  return row.nature === tab;
}

function ownershipLabel(row: MovementRow) {
  if (row.nature !== "expense" && row.nature !== "reversal") {
    return "Não se aplica";
  }
  if (row.ownershipSource === "manual") return "Definida";
  if (row.ownershipSource === "user_rule") return "Por regra";
  return "A definir";
}

function directionLabel(direction: MovementRow["direction"]) {
  if (direction === "inflow") return "Entrada";
  if (direction === "outflow") return "Saída";
  return "Ajuste";
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    manual: "Definida manualmente",
    user_rule: "Definida por regra",
    merchant_mapping: "Definida pelo merchant",
    global_rule: "Definida por regra global",
    parser: "Sugerida na importação",
    heuristic: "Sugerida por heurística",
    ai_suggestion: "Sugerida",
    unknown: "Ainda não definida",
  };
  return labels[source] ?? "Ainda não definida";
}

function formattedDate(value: string | null) {
  return value ? date.format(new Date(`${value}T00:00:00Z`)) : "Sem data";
}

function candidateLabel(linkType: ReconciliationCandidate["linkType"]) {
  return linkType === "own_transfer_pair"
    ? "Transferência entre contas próprias"
    : "Estorno de uma despesa";
}

function evidenceLabel(field: string) {
  const labels: Record<string, string> = {
    own_accounts: "contas próprias",
    opposite_direction: "direções opostas",
    amount: "mesmo valor",
    currency: "mesma moeda",
    occurred_on: "mesma data",
    source_scope: "mesma conta ou cartão",
    chronology: "ordem das datas",
  };
  return labels[field] ?? field;
}

function CardPaymentAllocationForm({
  payment,
  statements,
  allocations,
  action,
  removeAction,
}: {
  payment: MovementRow;
  statements: CardStatement[];
  allocations: CardPaymentAllocation[];
  action: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const [removalId, setRemovalId] = useState<string | null>(null);
  const paymentAllocations = allocations.filter(
    (allocation) => allocation.paymentTransactionId === payment.id,
  );
  const allocatedAmount = allocations
    .filter((allocation) => allocation.paymentTransactionId === payment.id)
    .reduce((total, allocation) => total + allocation.amount, 0);
  const remaining = Math.max(payment.amount - allocatedAmount, 0);
  const [statementId, setStatementId] = useState(statements[0]?.id ?? "");
  const selectedStatement = statements.find(
    (statement) => statement.id === statementId,
  );
  const statementRemaining = selectedStatement
    ? selectedStatement.totalDue && selectedStatement.totalDue > 0
      ? Math.max(
          selectedStatement.totalDue - selectedStatement.allocatedAmount,
          0,
        )
      : null
    : null;
  const maxAmount =
    statementRemaining === null
      ? remaining
      : Math.min(remaining, statementRemaining);
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const validAmount = Number(amount) > 0 && Number(amount) <= maxAmount;

  return (
    <section className="terra-payment-reconciliation">
      <h3>Conciliação de pagamento de fatura</h3>
      <p>
        Este pagamento não vira gasto novo. Distribua-o apenas entre faturas
        documentadas, inclusive de forma parcial.
      </p>
      <dl className="terra-reconciliation-totals">
        <div>
          <dt>Pagamento</dt>
          <dd>{currency.format(payment.amount)}</dd>
        </div>
        <div>
          <dt>Já conciliado</dt>
          <dd>{currency.format(allocatedAmount)}</dd>
        </div>
        <div>
          <dt>Disponível</dt>
          <dd>{currency.format(remaining)}</dd>
        </div>
      </dl>
      {paymentAllocations.length ? (
        <section className="terra-existing-payment-allocations">
          <h4>Valores já conciliados</h4>
          <ul>
            {paymentAllocations.map((allocation) => {
              const statement = statements.find(
                (item) => item.id === allocation.statementId,
              );
              const statementLabel = [
                statement?.cardName ?? "Fatura documentada",
                statement?.cycleEnd
                  ? `ciclo ${formattedDate(statement.cycleEnd)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const isConfirmingRemoval = removalId === allocation.id;
              return (
                <li key={allocation.id}>
                  <span>
                    <strong>{statementLabel}</strong>
                    <small>{currency.format(allocation.amount)}</small>
                  </span>
                  {isConfirmingRemoval ? (
                    <div className="terra-removal-confirmation" role="alert">
                      <p>
                        Remover este vínculo reabrirá a pendência de conciliação
                        deste pagamento.
                      </p>
                      <div>
                        <button
                          className="button secondary"
                          onClick={() => setRemovalId(null)}
                          type="button"
                        >
                          Cancelar
                        </button>
                        <form action={removeAction}>
                          <input
                            name="allocationId"
                            type="hidden"
                            value={allocation.id}
                          />
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/movements"
                          />
                          <button className="button danger" type="submit">
                            Confirmar remoção
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="button secondary"
                      onClick={() => setRemovalId(allocation.id)}
                      type="button"
                    >
                      Remover conciliação
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {!statements.length ? (
        <p className="notice review-notice">
          Ainda não há faturas documentadas disponíveis para este pagamento.
        </p>
      ) : remaining === 0 ? (
        <p className="notice success">
          Todo o valor deste pagamento já está conciliado.
        </p>
      ) : (
        <form action={action} className="terra-payment-allocation-form">
          <input name="paymentTransactionId" type="hidden" value={payment.id} />
          <input name="returnTo" type="hidden" value="/movements" />
          <label>
            Fatura documentada
            <select
              name="statementId"
              onChange={(event) => {
                const nextId = event.target.value;
                setStatementId(nextId);
                const next = statements.find(
                  (statement) => statement.id === nextId,
                );
                const nextRemaining =
                  next?.totalDue && next.totalDue > 0
                    ? Math.max(next.totalDue - next.allocatedAmount, 0)
                    : remaining;
                setAmount(Math.min(remaining, nextRemaining).toFixed(2));
              }}
              value={statementId}
            >
              {statements.map((statement) => {
                const description = [
                  statement.cardName ?? "Cartão não identificado",
                  statement.cycleEnd
                    ? `ciclo ${formattedDate(statement.cycleEnd)}`
                    : null,
                  statement.totalDue === null
                    ? "total não informado"
                    : statement.totalDue === 0
                      ? "fatura zerada"
                      : currency.format(statement.totalDue),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <option key={statement.id} value={statement.id}>
                    {description}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Valor a conciliar
            <input
              inputMode="decimal"
              max={maxAmount.toFixed(2)}
              min="0.01"
              name="amount"
              onChange={(event) => setAmount(event.target.value)}
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </label>
          {selectedStatement?.totalDue === 0 ? (
            <p className="terra-provenance">
              Esta fatura foi documentada como zerada; ela pode evidenciar uma
              antecipação, por isso não há teto pelo total da fatura.
            </p>
          ) : null}
          <button
            className="button primary"
            disabled={!validAmount}
            type="submit"
          >
            Conciliar valor informado
          </button>
        </form>
      )}
    </section>
  );
}

export function MovementsWorkspace({
  rows,
  people,
  reconciliationCandidates,
  cardStatements,
  cardPaymentAllocations,
  actions,
}: {
  rows: MovementRow[];
  people: Person[];
  reconciliationCandidates: ReconciliationCandidate[];
  cardStatements: CardStatement[];
  cardPaymentAllocations: CardPaymentAllocation[];
  actions: MovementActions;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const searchable = [
          row.description,
          row.category,
          row.accountOrCard,
          economicNatureLabel(row.nature),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR");
        return matchesTab(row, tab) && searchable.includes(normalizedQuery);
      }),
    [normalizedQuery, rows, tab],
  );
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const selectedCandidates = selected
    ? reconciliationCandidates.filter(
        (candidate) =>
          candidate.fromTransactionId === selected.id ||
          candidate.toTransactionId === selected.id,
      )
    : [];

  return (
    <>
      <section
        aria-label="Filtrar movimentações"
        className="terra-movements-toolbar"
      >
        <label className="terra-search-field">
          <span>Buscar movimentação</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Descrição, categoria ou conta"
            type="search"
            value={query}
          />
        </label>
        <div
          aria-label="Tipo de movimentação"
          className="terra-movement-tabs"
          role="tablist"
        >
          {tabs.map((item) => (
            <button
              aria-selected={tab === item.id}
              key={item.id}
              onClick={() => setTab(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="terra-result-count">
          {filteredRows.length} de {rows.length} movimentações
        </p>
      </section>

      {!filteredRows.length ? (
        <section className="terra-empty-flow" aria-live="polite">
          <h2>Nenhuma movimentação encontrada</h2>
          <p>
            Altere a busca ou escolha outra aba para ver os registros
            importados.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setTab("all");
            }}
            type="button"
          >
            Limpar busca
          </button>
        </section>
      ) : (
        <div className="terra-movements-table-wrap">
          <table className="terra-movements-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Descrição</th>
                <th scope="col">Conta / cartão</th>
                <th scope="col">Categoria</th>
                <th scope="col">Titularidade</th>
                <th scope="col">Natureza</th>
                <th className="terra-amount-cell" scope="col">
                  Valor
                </th>
                <th scope="col">
                  <span className="sr-only">Detalhes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Data">{formattedDate(row.occurredOn)}</td>
                  <td data-label="Descrição">
                    <strong>{row.description}</strong>
                    <span>{directionLabel(row.direction)}</span>
                  </td>
                  <td data-label="Conta / cartão">
                    {row.accountOrCard ?? "Não identificado"}
                  </td>
                  <td data-label="Categoria">{row.category ?? "A revisar"}</td>
                  <td data-label="Titularidade">
                    <span
                      className={`terra-status-chip${ownershipLabel(row) === "A definir" ? " is-pending" : ""}`}
                    >
                      {ownershipLabel(row)}
                    </span>
                  </td>
                  <td data-label="Natureza">
                    {economicNatureLabel(row.nature)}
                  </td>
                  <td className="terra-amount-cell" data-label="Valor">
                    {currency.format(row.amount)}
                  </td>
                  <td>
                    <button
                      aria-controls="movement-detail"
                      className="terra-row-action"
                      onClick={() => setSelectedId(row.id)}
                      type="button"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="terra-drawer-layer" id="movement-detail">
          <button
            aria-label="Fechar detalhe da movimentação"
            className="terra-drawer-backdrop"
            onClick={() => setSelectedId(null)}
            type="button"
          />
          <aside
            aria-label="Detalhe da movimentação"
            aria-modal="true"
            className="terra-movement-drawer"
            role="dialog"
          >
            <div className="terra-drawer-heading">
              <div>
                <p className="eyebrow">Movimentação</p>
                <h2>{selected.description}</h2>
                <p>
                  {formattedDate(selected.occurredOn)} ·{" "}
                  {currency.format(selected.amount)}
                </p>
              </div>
              <button
                className="terra-icon-button"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                <span className="sr-only">Fechar</span>×
              </button>
            </div>

            <section className="terra-detail-section">
              <h3>Classificação econômica</h3>
              <p>
                Escolha o que esta movimentação representa. A decisão manual
                fica protegida contra reprocessamento.
              </p>
              <form action={actions.setNature} className="movement-nature">
                <input name="transactionId" type="hidden" value={selected.id} />
                <input name="returnTo" type="hidden" value="/movements" />
                <label>
                  Natureza econômica
                  <select defaultValue={selected.nature} name="nature">
                    {ECONOMIC_NATURE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button primary" type="submit">
                  Salvar natureza
                </button>
              </form>
              <p className="terra-provenance">
                Origem atual: {sourceLabel(selected.natureSource)}.
              </p>
            </section>

            {selected.nature === "expense" || selected.nature === "reversal" ? (
              <section className="terra-detail-section">
                <h3>De quem é esta despesa?</h3>
                <p>
                  Use “100% minha” quando o valor inteiro é seu. Escolha outra
                  pessoa ou divida somente se houver parte de terceiro.
                </p>
                <OwnershipForm
                  action={actions.setOwnership}
                  initialAllocations={selected.allocations}
                  key={selected.id}
                  people={people}
                  returnTo="/movements"
                  transactionAmount={selected.amount}
                  transactionId={selected.id}
                />
                <p className="terra-provenance">
                  Titularidade atual: {sourceLabel(selected.ownershipSource)}.
                </p>
              </section>
            ) : (
              <section className="terra-context-note terra-detail-section">
                <h3>Titularidade</h3>
                <p>
                  O rateio é usado apenas para gastos e estornos. Defina
                  primeiro a natureza como “Gasto” se esta for uma despesa
                  compartilhada.
                </p>
              </section>
            )}

            {selected.nature === "card_payment" ? (
              <section className="terra-detail-section">
                <CardPaymentAllocationForm
                  action={actions.allocateCardPayment}
                  allocations={cardPaymentAllocations}
                  payment={selected}
                  removeAction={actions.removeCardPaymentAllocation}
                  statements={cardStatements}
                />
              </section>
            ) : null}

            <section className="terra-detail-section">
              <h3>Conciliação</h3>
              <p>
                Sugestões são apenas evidência. Nada é vinculado, classificado
                ou removido sem sua confirmação.
              </p>
              {selectedCandidates.length ? (
                <ul className="terra-reconciliation-candidates">
                  {selectedCandidates.map((candidate) => {
                    const otherId =
                      candidate.fromTransactionId === selected.id
                        ? candidate.toTransactionId
                        : candidate.fromTransactionId;
                    const other = rows.find((row) => row.id === otherId);
                    if (!other) return null;
                    return (
                      <li key={candidate.id}>
                        <div>
                          <strong>{candidateLabel(candidate.linkType)}</strong>
                          <span>
                            {formattedDate(other.occurredOn)} ·{" "}
                            {other.description} ·{" "}
                            {currency.format(other.amount)}
                          </span>
                          {candidate.evidenceFields.length ? (
                            <small>
                              Evidências:{" "}
                              {candidate.evidenceFields
                                .map(evidenceLabel)
                                .join(", ")}
                            </small>
                          ) : null}
                        </div>
                        <div className="terra-candidate-actions">
                          <form action={actions.createLink}>
                            <input
                              name="fromTransactionId"
                              type="hidden"
                              value={candidate.fromTransactionId}
                            />
                            <input
                              name="toTransactionId"
                              type="hidden"
                              value={candidate.toTransactionId}
                            />
                            <input
                              name="linkType"
                              type="hidden"
                              value={candidate.linkType}
                            />
                            <input
                              name="amount"
                              type="hidden"
                              value={candidate.amount.toFixed(2)}
                            />
                            <input
                              name="returnTo"
                              type="hidden"
                              value="/movements"
                            />
                            <button className="button primary" type="submit">
                              Confirmar vínculo
                            </button>
                          </form>
                          <form action={actions.dismissCandidate}>
                            <input
                              name="candidateId"
                              type="hidden"
                              value={candidate.id}
                            />
                            <input
                              name="returnTo"
                              type="hidden"
                              value="/movements"
                            />
                            <button className="button secondary" type="submit">
                              Não são o mesmo evento
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="terra-empty-state">
                  Não há sugestões automáticas abertas para esta movimentação.
                </p>
              )}
              <details className="movement-link">
                <summary>Adicionar outro vínculo manual</summary>
                <form action={actions.createLink} className="movement-nature">
                  <input
                    name="fromTransactionId"
                    type="hidden"
                    value={selected.id}
                  />
                  <input name="returnTo" type="hidden" value="/movements" />
                  <label>
                    Tipo de vínculo
                    <select defaultValue="related" name="linkType">
                      {TRANSACTION_LINK_TYPE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Movimentação relacionada
                    <select name="toTransactionId" required>
                      <option value="">Selecione</option>
                      {rows
                        .filter((row) => row.id !== selected.id)
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {formattedDate(row.occurredOn)} · {row.description}{" "}
                            · {currency.format(row.amount)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Valor conciliado
                    <input
                      defaultValue={selected.amount.toFixed(2)}
                      inputMode="decimal"
                      min="0"
                      name="amount"
                      pattern="[0-9]+([.][0-9]{1,2})?"
                      required
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <button className="button secondary" type="submit">
                    Registrar vínculo
                  </button>
                </form>
              </details>
            </section>

            <section className="terra-detail-section terra-original-data">
              <h3>Origem preservada</h3>
              <dl>
                <div>
                  <dt>Descrição importada</dt>
                  <dd>{selected.description}</dd>
                </div>
                <div>
                  <dt>Arquivo</dt>
                  <dd>{selected.sourceFile ?? "Arquivo não disponível"}</dd>
                </div>
                <div>
                  <dt>Parser</dt>
                  <dd>{selected.parser ?? "Não informado"}</dd>
                </div>
                <div>
                  <dt>Competência</dt>
                  <dd>{selected.competenceMonth.slice(0, 7)}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
