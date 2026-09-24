import Link from "next/link";

import {
  groupCommitmentsByMonth,
  prepareCommitments,
  summarizeCommitments,
} from "@/features/commitments/commitment-data";
import { TerraPage } from "@/features/ui/terra-page";
import { createClient } from "@/lib/supabase/server";

import styles from "./commitments.module.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function currentMonth() {
  const today = new Date();
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(value: string) {
  return monthFormat.format(new Date(`${value}T00:00:00Z`));
}

export default async function CommitmentsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .select(
      "id, installment_number, competence_month, amount, installment_groups(description, total_installments, cards(name, last_four)), installment_allocations(owner_type, amount, people(full_name))",
    )
    .eq("status", "scheduled")
    .gte("competence_month", currentMonth())
    .order("competence_month")
    .limit(500);
  if (error) {
    return (
      <TerraPage current="/commitments">
        <section className={`card ${styles.page}`}>
          <Link className="back-link" href="/dashboard">
            ← Visão geral
          </Link>
          <p className="eyebrow">Compromissos</p>
          <h1>Parcelas futuras conhecidas</h1>
          <section className={styles.error} role="alert">
            <h2>Não foi possível carregar os compromissos</h2>
            <p>
              Atualize a página. Se o problema continuar, confira sua conexão e
              se as atualizações do banco foram aplicadas.
            </p>
            <Link className="button secondary" href="/commitments">
              Tentar novamente
            </Link>
          </section>
        </section>
      </TerraPage>
    );
  }
  const commitments = prepareCommitments(
    (data ?? []).map((item) => {
      const group = Array.isArray(item.installment_groups)
        ? item.installment_groups[0]
        : item.installment_groups;
      const card = group
        ? Array.isArray(group.cards)
          ? group.cards[0]
          : group.cards
        : null;
      return {
        id: item.id,
        competenceMonth: item.competence_month,
        installmentNumber: item.installment_number,
        amount: item.amount,
        description: group?.description ?? "Compra parcelada",
        totalInstallments: group?.total_installments ?? item.installment_number,
        cardName: card?.name ?? null,
        cardLastFour: card?.last_four ?? null,
        allocations: (item.installment_allocations ?? []).map((allocation) => {
          const person = Array.isArray(allocation.people)
            ? allocation.people[0]
            : allocation.people;
          return {
            ownerType: allocation.owner_type,
            amount: allocation.amount,
            personName: person?.full_name ?? null,
          };
        }),
      };
    }),
  );
  const totals = summarizeCommitments(commitments);
  const monthly = groupCommitmentsByMonth(commitments);
  const monthlyMaximum = Math.max(
    1,
    ...monthly.map((month) => month.totalAmount),
  );
  return (
    <TerraPage current="/commitments">
      <section className={`card ${styles.page}`}>
        <Link className="back-link" href="/dashboard">
          ← Visão geral
        </Link>
        <p className="eyebrow">Compromissos</p>
        <h1>Parcelas futuras conhecidas</h1>
        <p className="muted">
          Não há previsão de renda: esta tela mostra apenas obrigações já
          identificadas em faturas.
        </p>
        {!commitments.length ? (
          <section className={styles.empty}>
            <h2>Nenhuma parcela futura conhecida</h2>
            <p>
              Parcelas aparecem aqui quando uma compra parcelada é identificada
              em uma fatura importada. Não criamos previsões sem evidência.
            </p>
            <Link className="button primary" href="/imports">
              Importar fatura
            </Link>
          </section>
        ) : (
          <>
            <section
              aria-label="Totais de compromissos"
              className={styles.totals}
            >
              <div>
                <span>Total futuro</span>
                <strong>{money.format(totals.totalAmount)}</strong>
              </div>
              <div>
                <span>Parte pessoal</span>
                <strong>{money.format(totals.personalAmount)}</strong>
              </div>
              <div>
                <span>Parte de terceiros</span>
                <strong>{money.format(totals.thirdPartyAmount)}</strong>
              </div>
            </section>

            <section
              aria-labelledby="commitment-chart-title"
              className={styles.monthly}
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className="eyebrow">Por competência</p>
                  <h2 id="commitment-chart-title">Compromissos mensais</h2>
                </div>
                <p>Totais conhecidos, separados entre você e terceiros.</p>
              </div>
              <ul>
                {monthly.map((month) => (
                  <li key={month.competenceMonth}>
                    <Link
                      href={`/movements?month=${month.competenceMonth.slice(0, 7)}`}
                    >
                      {monthLabel(month.competenceMonth)}
                    </Link>
                    <span>
                      Total {money.format(month.totalAmount)} · pessoal{" "}
                      {money.format(month.personalAmount)} · terceiros{" "}
                      {money.format(month.thirdPartyAmount)}
                    </span>
                    <i
                      aria-hidden="true"
                      style={{
                        width: `${(month.totalAmount / monthlyMaximum) * 100}%`,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="commitment-details-title"
              className={styles.details}
            >
              <h2 id="commitment-details-title">Detalhe das parcelas</h2>
              <ul>
                {commitments.map((commitment) => (
                  <li key={commitment.id}>
                    <div className={styles.commitmentHeading}>
                      <div>
                        <strong>{commitment.description}</strong>
                        <span>
                          Parcela {commitment.installmentNumber}/
                          {commitment.totalInstallments} ·{" "}
                          {monthLabel(commitment.competenceMonth)}
                        </span>
                      </div>
                      <Link
                        className="button secondary"
                        href={`/movements?month=${commitment.competenceMonth.slice(0, 7)}`}
                      >
                        Ver movimentações
                      </Link>
                    </div>
                    <dl>
                      <div>
                        <dt>Cartão</dt>
                        <dd>
                          {commitment.cardName
                            ? `${commitment.cardName}${
                                commitment.cardLastFour
                                  ? ` · final ${commitment.cardLastFour}`
                                  : ""
                              }`
                            : "Não informado"}
                        </dd>
                      </div>
                      <div>
                        <dt>Parte pessoal</dt>
                        <dd>{money.format(commitment.personalAmount)}</dd>
                      </div>
                      <div>
                        <dt>Parte de terceiros</dt>
                        <dd>{money.format(commitment.thirdPartyAmount)}</dd>
                      </div>
                      <div>
                        <dt>Valor total</dt>
                        <dd>{money.format(commitment.amount)}</dd>
                      </div>
                      <div>
                        <dt>Pessoas relacionadas</dt>
                        <dd>
                          {commitment.relatedPeople.length
                            ? commitment.relatedPeople.join(", ")
                            : "Nenhuma"}
                        </dd>
                      </div>
                    </dl>
                    {commitment.isFinalInstallment ? (
                      <p className={styles.finalInstallment}>
                        Última parcela: este compromisso termina após esta
                        competência.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </section>
    </TerraPage>
  );
}
