"use client";

import { useRef, useState, useTransition } from "react";

import {
  importNubankStatementPdf,
  previewNubankStatementPdf,
  type NubankPdfPreview,
} from "./actions";

export function NubankPdfImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<NubankPdfPreview | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestPreview() {
    if (!formRef.current) return;
    setPreview(null);
    startTransition(async () => {
      setPreview(
        await previewNubankStatementPdf(new FormData(formRef.current!)),
      );
    });
  }

  return (
    <form className="stack" action={importNubankStatementPdf} ref={formRef}>
      <label>
        Extrato Nubank em PDF
        <input
          accept=".pdf,application/pdf"
          name="file"
          required
          type="file"
          onChange={requestPreview}
        />
      </label>
      {isPending ? <p className="muted">Lendo o PDF localmente…</p> : null}
      {preview ? (
        <p
          className={`notice ${preview.success ? "success" : "error"}`}
          role="status"
        >
          {preview.success
            ? `Reconhecido: ${preview.transactionCount} movimentações. Revise e confirme o envio.`
            : preview.message}
        </p>
      ) : null}
      <button
        className="button primary"
        disabled={!preview?.success || isPending}
        type="submit"
      >
        Importar extrato e confirmar
      </button>
    </form>
  );
}
