import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, currency, timezone")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error("Não foi possível carregar o perfil autenticado.");
  }

  return (
    <main className="centered-page">
      <section className="card profile-card" aria-labelledby="profile-title">
        <div>
          <p className="eyebrow">Fundação concluída</p>
          <h1 id="profile-title">Seu perfil</h1>
          <p className="muted">
            Esta tela valida o caminho completo Auth → sessão SSR → consulta com
            RLS. Funcionalidades financeiras entram apenas nas próximas etapas.
          </p>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>Nome de exibição</dt>
            <dd>{profile.display_name ?? "Não informado"}</dd>
          </div>
          <div>
            <dt>Moeda</dt>
            <dd>{profile.currency}</dd>
          </div>
          <div>
            <dt>Fuso horário</dt>
            <dd>{profile.timezone}</dd>
          </div>
        </dl>

        <form action={signOut}>
          <button className="button secondary" type="submit">
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}
