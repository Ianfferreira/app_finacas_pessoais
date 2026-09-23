import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["/dashboard", "Visão geral"],
  ["/movements", "Movimentações"],
  ["/review", "Revisão"],
  ["/third-parties", "Terceiros"],
  ["/history", "Histórico"],
  ["/commitments", "Compromissos"],
  ["/imports", "Importações"],
  ["/rules", "Regras"],
] as const;

type TerraPageProps = {
  children: ReactNode;
  current: (typeof navigation)[number][0] | "/settings";
};

export function TerraPage({ children, current }: TerraPageProps) {
  return (
    <div className="terra-app-shell">
      <aside className="terra-sidebar" aria-label="Navegação principal">
        <Link className="terra-brand" href="/dashboard">
          <span aria-hidden="true" className="terra-brand-mark">
            ◒
          </span>
          <span>
            <strong>Finanças pessoais</strong>
            <small>Clareza para decidir</small>
          </span>
        </Link>
        <nav className="terra-navigation">
          {navigation.map(([href, label]) => (
            <Link
              aria-current={current === href ? "page" : undefined}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          aria-current={current === "/settings" ? "page" : undefined}
          className="terra-settings-link"
          href="/settings"
        >
          Configurações
        </Link>
      </aside>
      <main className="terra-workspace-main">
        <header className="terra-workspace-topbar">
          <span>Dados financeiros auditáveis</span>
          <Link href="/imports">Importar dados</Link>
        </header>
        <div className="terra-workspace-content">{children}</div>
      </main>
    </div>
  );
}
