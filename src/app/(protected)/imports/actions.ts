"use server";

import { redirect } from "next/navigation";

import { sha256 } from "@/features/imports/file-hash";
import { parseNubankStatementCsv } from "@/features/imports/nubank-statement-csv";
import { createClient } from "@/lib/supabase/server";

export async function importNubankCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    redirect("/imports?error=Selecione%20um%20CSV.");
  if (file.size > 25 * 1024 * 1024)
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
