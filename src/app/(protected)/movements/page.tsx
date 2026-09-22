import Link from "next/link";

import { ECONOMIC_NATURE_OPTIONS } from "@/domain/natures";
import { TRANSACTION_LINK_TYPE_OPTIONS } from "@/domain/transaction-links";
import { createClient } from "@/lib/supabase/server";
import { createTransactionLink, setTransactionNature } from "./actions";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, occurred_on, description_raw, amount, direction, nature")
    .order("occurred_on", { ascending: false })
    .limit(100);
  return (
    <main className="centered-page">
      <section className="card">
        <Link className="back-link" href="/imports">
          ← Importações
        </Link>
        <p className="eyebrow">Movimentações</p>
        <h1>Registros importados</h1>
        <Link className="button secondary" href="/review">
          Abrir revisão
        </Link>
        {success ? <p className="notice success">{success}</p> : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        {!data?.length ? (
          <p className="muted">Ainda não há movimentações importadas.</p>
        ) : (
          <ul className="stack">
            {data.map((row) => (
              <li className="movement" key={row.id}>
                <strong>{row.description_raw}</strong>
                <br />
                <span className="muted">
                  {row.occurred_on ?? "Sem data"} · {row.direction} · R${" "}
                  {row.amount}
                </span>
                <form action={setTransactionNature} className="movement-nature">
                  <input name="transactionId" type="hidden" value={row.id} />
                  <label>
                    Natureza econômica
                    <select defaultValue={row.nature} name="nature">
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
                <details className="movement-link">
                  <summary>Relacionar com outra movimentação</summary>
                  <form
                    action={createTransactionLink}
                    className="movement-nature"
                  >
                    <input
                      name="fromTransactionId"
                      type="hidden"
                      value={row.id}
                    />
                    <label>
                      Tipo de vínculo
                      <select defaultValue="related" name="linkType">
                        {TRANSACTION_LINK_TYPE_OPTIONS.map(
                          ({ value, label }) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Movimentação relacionada
                      <select name="toTransactionId" required>
                        <option value="">Selecione</option>
                        {data
                          .filter((candidate) => candidate.id !== row.id)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.occurred_on ?? "Sem data"} ·{" "}
                              {candidate.description_raw} · R${" "}
                              {candidate.amount}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Valor conciliado
                      <input
                        defaultValue={row.amount.toFixed(2)}
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
