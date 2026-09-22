"use client";

import { useRef, useState, useTransition } from "react";

import {
  importCardStatement,
  previewCardStatement,
  type CardStatementPreview,
} from "./actions";

export function CardStatementImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<CardStatementPreview | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestPreview() {
    const form = formRef.current;
    if (!form) return;
    setPreview(null);
    startTransition(async () =>
      setPreview(await previewCardStatement(new FormData(form))),
    );
  }

  const ready = preview?.success === true;
  return (
    <form className="stack" action={importCardStatement} ref={formRef}>
      <label>
        Fatura ou extrato de cartão
        <input
          accept=".csv,text/csv,.pdf,application/pdf"
          name="file"
          required
          type="file"
          onChange={requestPreview}
        />
      </label>
      {isPending ? <p className="muted">Lendo o arquivo localmente…</p> : null}
      {preview ? (
        <p
          className={`notice ${preview.success ? "success" : "error"}`}
          role="status"
        >
          {preview.success
            ? `Reconhecido: ${preview.institution} (${preview.parser}). ${preview.transactionCount} lançamentos em ${preview.cardCount} cartão(ões)${preview.dueOn ? `; vencimento ${preview.dueOn}` : ""}. Revise e confirme o envio.`
            : preview.message}
        </p>
      ) : null}
      <button
        className="button primary"
        disabled={!ready || isPending}
        type="submit"
      >
        Importar fatura e confirmar
      </button>
    </form>
  );
}
