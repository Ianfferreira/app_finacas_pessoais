import Link from "next/link";

import { safeRedirectPath } from "@/features/auth/credentials";

import { signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const next = safeRedirectPath(parameters.next ?? null);

  return (
    <main className="centered-page">
      <section className="card auth-card" aria-labelledby="login-title">
        <Link className="back-link" href="/">
          ← Início
        </Link>
        <p className="eyebrow">Acesso seguro</p>
        <h1 id="login-title">Entre na sua conta</h1>
        <p className="muted">
          Use e-mail e senha. Cada perfil é protegido por políticas no banco,
          além da autenticação da interface.
        </p>

        {parameters.error ? (
          <p className="notice error" role="alert">
            {parameters.error}
          </p>
        ) : null}
        {parameters.message ? (
          <p className="notice success" role="status">
            {parameters.message}
          </p>
        ) : null}

        <form className="stack" action={signIn}>
          <input type="hidden" name="next" value={next} />
          <label>
            E-mail
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              required
              type="email"
            />
          </label>
          <label>
            Senha
            <input
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              name="password"
              required
              type="password"
            />
          </label>
          <div className="actions">
            <button className="button primary" type="submit">
              Entrar
            </button>
            <button
              className="button secondary"
              formAction={signUp}
              type="submit"
            >
              Criar conta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
