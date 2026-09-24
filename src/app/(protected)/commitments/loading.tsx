import { TerraPage } from "@/features/ui/terra-page";

import styles from "./commitments.module.css";

export default function CommitmentsLoading() {
  return (
    <TerraPage current="/commitments">
      <section aria-busy="true" className={`card ${styles.page}`}>
        <p className="eyebrow">Compromissos</p>
        <h1>Carregando parcelas futuras conhecidas</h1>
        <p className="muted">Organizando as obrigações por competência.</p>
      </section>
    </TerraPage>
  );
}
