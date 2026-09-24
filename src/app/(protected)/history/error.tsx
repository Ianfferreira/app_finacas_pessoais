"use client";

import { TerraPage } from "@/features/ui/terra-page";

import styles from "./history.module.css";

export default function HistoryError({ reset }: { reset: () => void }) {
  return (
    <TerraPage current="/history">
      <section className={`card ${styles.page}`}>
        <p className="eyebrow">Histórico</p>
        <h1>Evolução por competência</h1>
        <section className={styles.error} role="alert">
          <h2>O histórico encontrou um problema inesperado</h2>
          <p>Tente carregar novamente. Seus dados não foram alterados.</p>
          <button className="button secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        </section>
      </section>
    </TerraPage>
  );
}
