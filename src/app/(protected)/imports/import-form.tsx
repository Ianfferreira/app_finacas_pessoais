"use client";
import { useState } from "react";
import { parseNubankStatementCsv } from "@/features/imports/nubank-statement-csv";
import { importNubankCsv } from "./actions";
export function ImportForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  async function read(file?: File) {
    setReady(false);
    setPreview(null);
    if (!file) return;
    const result = parseNubankStatementCsv(await file.text());
    if (!result.success) {
      setPreview(result.message);
      return;
    }
    setPreview(
      `Preview: ${result.rows.length} movimentações reconhecidas. A conta “Conta Nubank” será criada se necessário.`,
    );
    setReady(true);
  }
  return (
    <form className="stack" action={importNubankCsv}>
      <label>
        Arquivo CSV
        <input
          accept=".csv,text/csv"
          name="file"
          required
          type="file"
          onChange={(event) => void read(event.target.files?.[0])}
        />
      </label>
      {preview ? (
        <p className={`notice ${ready ? "success" : "error"}`} role="status">
          {preview}
        </p>
      ) : null}
      <button className="button primary" disabled={!ready} type="submit">
        Importar e confirmar
      </button>
    </form>
  );
}
