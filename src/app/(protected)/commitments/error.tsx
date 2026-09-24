"use client";

import { TerraPage } from "@/features/ui/terra-page";

import styles from "./commitments.module.css";

export default function CommitmentsError({ reset }: { reset: () => void }) {
  return (
    <TerraPage current="/commitments">
      <section className={`card ${styles.page}`}>
        <p className="eyebrow">Compromissos</p>
        <h1>Parcelas futuras conhecidas</h1>
        <section className={styles.error} role="alert">
          <h2>Os compromissos encontraram um problema inesperado</h2>
          <p>Tente carregar novamente. Seus dados não foram alterados.</p>
          <button className="button secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        </section>
      </section>
    </TerraPage>
  );
}
