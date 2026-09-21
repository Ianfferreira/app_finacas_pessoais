import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("occurred_on, description_raw, amount, direction, nature")
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
        {success ? <p className="notice success">{success}</p> : null}
        {!data?.length ? (
          <p className="muted">Ainda não há movimentações importadas.</p>
        ) : (
          <ul className="stack">
            {data.map((row) => (
              <li key={`${row.occurred_on}-${row.description_raw}`}>
                <strong>{row.description_raw}</strong>
                <br />
                <span className="muted">
                  {row.occurred_on ?? "Sem data"} · {row.direction} · R${" "}
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
