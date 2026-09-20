import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <main className="centered-page">
      <section className="card hero" aria-labelledby="page-title">
        <p className="eyebrow">Finanças pessoais</p>
        <h1 id="page-title">Uma base segura para entender seu dinheiro.</h1>
        <p className="lede">
          A aplicação está na fase de fundação. Autenticação e isolamento do
          perfil já formam a fronteira de segurança para os próximos
          incrementos.
        </p>
        <Link
          className="button primary"
          href={data?.claims ? "/dashboard" : "/login"}
        >
          {data?.claims ? "Abrir meu perfil" : "Entrar"}
        </Link>
      </section>
    </main>
  );
}
