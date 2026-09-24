import { TerraPage } from "@/features/ui/terra-page";

import styles from "./history.module.css";

export default function HistoryLoading() {
  return (
    <TerraPage current="/history">
      <section aria-busy="true" className={`card ${styles.page}`}>
        <p className="eyebrow">Histórico</p>
        <h1>Carregando evolução por competência</h1>
        <p className="muted">
          Buscando os meses realizados e seus fechamentos.
        </p>
      </section>
    </TerraPage>
  );
}
