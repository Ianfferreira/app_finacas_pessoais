"use server";

import { redirect } from "next/navigation";

import { cardStatementRpcPayload } from "@/features/imports/card-statement-payload";
import { parseCardStatementFile } from "@/features/imports/card-statement-file";
import { sha256 } from "@/features/imports/file-hash";
import { parseNubankStatementCsv } from "@/features/imports/nubank-statement-csv";
import {
  nubankPdfRowToRpc,
  parseNubankStatementPdfText,
} from "@/features/imports/nubank-statement-pdf";
import { extractPdfText } from "@/features/imports/pdf-text";
import { createClient } from "@/lib/supabase/server";

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export type CardStatementPreview =
  | {
      success: true;
      institution: string;
      parser: string;
      transactionCount: number;
      cardCount: number;
      dueOn: string | null;
      cycleEnd: string | null;
    }
  | { success: false; message: string };

export type NubankPdfPreview =
  | { success: true; transactionCount: number }
  | { success: false; message: string };

function getCardStatementFile(formData: FormData): File | null {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMPORT_BYTES) return null;
  return file;
}

export async function previewCardStatement(
  formData: FormData,
): Promise<CardStatementPreview> {
  const file = getCardStatementFile(formData);
  if (!file) {
    return { success: false, message: "Selecione um arquivo de até 25 MB." };
  }
  const parsed = await parseCardStatementFile(file);
  if (!parsed.success) return parsed;
  const cards = new Set(
    parsed.statement.transactions.map((row) => row.cardLastFour),
  );
  return {
    success: true,
    institution: parsed.statement.institutionCode,
    parser: parsed.statement.parserName,
    transactionCount: parsed.statement.transactions.length,
    cardCount: Math.max(cards.size, 1),
    dueOn: parsed.statement.dueOn,
    cycleEnd: parsed.statement.cycleEnd,
  };
}

export async function importNubankCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    redirect("/imports?error=Selecione%20um%20CSV.");
  if (file.size > MAX_IMPORT_BYTES)
    redirect("/imports?error=O%20arquivo%20excede%2025MB.");
  const content = await file.text();
  const parsed = parseNubankStatementCsv(content);
  if (!parsed.success)
    redirect(`/imports?error=${encodeURIComponent(parsed.message)}`);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/imports");
  const hash = sha256(content);
  const storagePath = `${userId}/${hash}.csv`;
  const { error: uploadError } = await supabase.storage
    .from("financial-imports")
    .upload(storagePath, file, { contentType: "text/csv", upsert: false });
  if (uploadError && !/already exists/i.test(uploadError.message))
    redirect("/imports?error=Não%20foi%20possível%20guardar%20o%20arquivo.");
  const rows = parsed.rows.map((row, index) => ({
    rowNumber: index + 2,
    occurredOn: row.occurredOn,
    signedAmount: (Number(row.signedAmountCents) / 100).toFixed(2),
    externalId: row.externalId,
    descriptionRaw: row.descriptionRaw,
  }));
  const { error } = await supabase.rpc("import_nubank_statement_csv", {
    p_sha256: hash,
    p_filename: file.name,
    p_size_bytes: file.size,
    p_storage_path: storagePath,
    p_rows: rows,
  });
  if (error) {
    if (/duplicate import/i.test(error.message))
      redirect("/imports?error=Este%20arquivo%20já%20foi%20importado.");
    redirect(
      "/imports?error=Não%20foi%20possível%20registrar%20a%20importação.",
    );
  }
  redirect(
    `/movements?success=${encodeURIComponent(`${rows.length} movimentações importadas.`)}`,
  );
}

function getPdfFile(formData: FormData): File | null {
  const file = getCardStatementFile(formData);
  if (
    !file ||
    (!file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf")
  ) {
    return null;
  }
  return file;
}

export async function previewNubankStatementPdf(
  formData: FormData,
): Promise<NubankPdfPreview> {
  const file = getPdfFile(formData);
  if (!file)
    return { success: false, message: "Selecione um PDF de até 25 MB." };
  try {
    const parsed = parseNubankStatementPdfText(await extractPdfText(file));
    return parsed.success
      ? { success: true, transactionCount: parsed.rows.length }
      : parsed;
  } catch {
    return {
      success: false,
      message: "Não foi possível ler este PDF. Verifique se ele possui senha.",
    };
  }
}

export async function importNubankStatementPdf(formData: FormData) {
  const file = getPdfFile(formData);
  if (!file)
    redirect("/imports?error=Selecione%20um%20PDF%20de%20at%C3%A9%2025%20MB.");
  let parsed;
  try {
    parsed = parseNubankStatementPdfText(await extractPdfText(file));
  } catch {
    redirect(
      "/imports?error=N%C3%A3o%20foi%20poss%C3%ADvel%20ler%20este%20PDF.",
    );
  }
  if (!parsed.success)
    redirect(`/imports?error=${encodeURIComponent(parsed.message)}`);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/imports");
  const hash = sha256(new Uint8Array(await file.arrayBuffer()));
  const storagePath = `${userId}/${hash}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("financial-imports")
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError && !/already exists/i.test(uploadError.message)) {
    redirect(
      "/imports?error=N%C3%A3o%20foi%20poss%C3%ADvel%20guardar%20o%20arquivo.",
    );
  }
  const rows = parsed.rows.map(nubankPdfRowToRpc);
  const { error } = await supabase.rpc("import_nubank_statement_pdf", {
    p_sha256: hash,
    p_filename: file.name,
    p_size_bytes: file.size,
    p_storage_path: storagePath,
    p_rows: rows,
  });
  if (error) {
    if (/duplicate import/i.test(error.message)) {
      redirect("/imports?error=Este%20arquivo%20j%C3%A1%20foi%20importado.");
    }
    redirect(
      "/imports?error=N%C3%A3o%20foi%20poss%C3%ADvel%20registrar%20o%20extrato.",
    );
  }
  redirect(
    `/movements?success=${encodeURIComponent(`${rows.length} movimentações Nubank importadas.`)}`,
  );
}

export async function importCardStatement(formData: FormData) {
  const file = getCardStatementFile(formData);
  if (!file) {
    redirect(
      "/imports?error=Selecione%20um%20arquivo%20de%20at%C3%A9%2025%20MB.",
    );
  }
  const parsed = await parseCardStatementFile(file);
  if (!parsed.success) {
    redirect(`/imports?error=${encodeURIComponent(parsed.message)}`);
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/imports");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = sha256(bytes);
  const extension = file.name.toLowerCase().endsWith(".csv") ? "csv" : "pdf";
  const mimeType = extension === "csv" ? "text/csv" : "application/pdf";
  const storagePath = `${userId}/${hash}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("financial-imports")
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError && !/already exists/i.test(uploadError.message)) {
    redirect(
      "/imports?error=N%C3%A3o%20foi%20poss%C3%ADvel%20guardar%20o%20arquivo.",
    );
  }

  const payload = cardStatementRpcPayload(parsed.statement);
  const rpcPayload = {
    p_sha256: hash,
    p_filename: file.name,
    p_mime_type: mimeType,
    p_size_bytes: file.size,
    p_storage_path: storagePath,
    p_institution_code: parsed.statement.institutionCode,
    p_parser_name: parsed.statement.parserName,
    p_parser_version: parsed.statement.parserVersion,
    p_card_last_fours: payload.cardLastFours,
    p_rows: payload.rows,
    ...(parsed.statement.cycleStart
      ? { p_cycle_start: parsed.statement.cycleStart }
      : {}),
    ...(parsed.statement.cycleEnd
      ? { p_cycle_end: parsed.statement.cycleEnd }
      : {}),
    ...(parsed.statement.dueOn ? { p_due_on: parsed.statement.dueOn } : {}),
  };
  const { error } = await supabase.rpc("import_card_statement", rpcPayload);
  if (error) {
    // Deliberately log only database diagnostics. File bytes and parsed
    // financial rows remain private evidence and must never enter logs.
    console.error("Card statement import RPC failed", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
    if (/duplicate import/i.test(error.message)) {
      redirect("/imports?error=Este%20arquivo%20j%C3%A1%20foi%20importado.");
    }
    if (error.code === "PGRST202") {
      redirect(
        "/imports?error=O%20banco%20online%20ainda%20n%C3%A3o%20reconhece%20a%20rotina%20de%20importa%C3%A7%C3%A3o.",
      );
    }
    redirect(
      "/imports?error=N%C3%A3o%20foi%20poss%C3%ADvel%20registrar%20a%20fatura.",
    );
  }
  redirect(
    `/movements?success=${encodeURIComponent(`${payload.rows.length} lançamentos de cartão importados.`)}`,
  );
}
