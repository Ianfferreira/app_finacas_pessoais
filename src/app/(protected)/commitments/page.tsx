import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { TerraPage } from "@/features/ui/terra-page";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function CommitmentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("installments")
    .select(
      "id, installment_number, competence_month, amount, installment_groups(description, total_installments), installment_allocations(owner_type, amount, people(full_name))",
    )
    .eq("status", "scheduled")
    .order("competence_month")
    .limit(200);
  return (
    <TerraPage current="/commitments">
      <section className="card">
        <Link className="back-link" href="/dashboard">
          ← Visão geral
        </Link>
        <p className="eyebrow">Compromissos</p>
        <h1>Parcelas futuras conhecidas</h1>
        <p className="muted">
          Não há previsão de renda: esta tela mostra apenas obrigações já
          identificadas em faturas.
        </p>
        {!data?.length ? (
          <p className="muted">Nenhuma parcela futura conhecida.</p>
        ) : (
          <ul className="stack">
            {data.map((item) => {
              const group = Array.isArray(item.installment_groups)
                ? item.installment_groups[0]
                : item.installment_groups;
              const allocations = item.installment_allocations ?? [];
              const thirdParty = allocations
                .filter((allocation) => allocation.owner_type === "third_party")
                .reduce((total, allocation) => total + allocation.amount, 0);
              return (
                <li className="movement" key={item.id}>
                  <strong>{group?.description ?? "Compra parcelada"}</strong>
                  <br />
                  <span className="muted">
                    Parcela {item.installment_number}/
                    {group?.total_installments ?? "?"} · competência{" "}
                    {item.competence_month} · pessoal{" "}
                    {money.format(item.amount - thirdParty)}
                    {thirdParty
                      ? ` · terceiros ${money.format(thirdParty)}`
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </TerraPage>
  );
}
