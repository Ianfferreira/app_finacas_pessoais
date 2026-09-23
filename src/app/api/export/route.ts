import { NextRequest } from "next/server";

import {
  createStructuredExportZip,
  transactionsToCsv,
} from "@/features/export/financial-export";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub)
    return new Response("Não autenticado.", { status: 401 });
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const [
    { data: transactions },
    { data: allocations },
    { data: people },
    { data: accounts },
    { data: cards },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, occurred_on, competence_month, description_raw, amount, direction, nature, category_id, card_id, account_id, is_void",
      )
      .order("occurred_on"),
    supabase
      .from("allocations")
      .select("transaction_id, owner_type, person_id, amount, source"),
    supabase.from("people").select("id, full_name, relationship, is_active"),
    supabase.from("accounts").select("id, name, type, currency, is_active"),
    supabase.from("cards").select("id, name, last_four, is_active"),
    supabase.from("categories").select("id, name, kind, is_active"),
  ]);
  const csv = transactionsToCsv(transactions ?? []);
  if (format === "csv") {
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="financas-movimentacoes.csv"',
      },
    });
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    transactions,
    allocations,
    people,
    accounts,
    cards,
    categories,
    notice:
      "Arquivos privados originais, raw_records e credenciais não são exportados por este endpoint.",
  };
  if (format === "zip") {
    const archive = Uint8Array.from(createStructuredExportZip(payload, csv));
    return new Response(archive.buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="financas-export.zip"',
      },
    });
  }
  return Response.json(payload, {
    headers: {
      "Content-Disposition": 'attachment; filename="financas-export.json"',
    },
  });
}
