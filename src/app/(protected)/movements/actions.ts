"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ECONOMIC_NATURE_VALUES } from "@/domain/natures";
import type { EconomicNature } from "@/domain/metrics";
import {
  TRANSACTION_LINK_TYPES,
  type TransactionLinkType,
} from "@/domain/transaction-links";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL_PATTERN = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;

function redirectWithError(message: string): never {
  redirect(`/movements?error=${encodeURIComponent(message)}`);
}

export async function setTransactionNature(formData: FormData) {
  const transactionId = formData.get("transactionId");
  const selectedNature = formData.get("nature");

  if (
    typeof transactionId !== "string" ||
    !UUID_PATTERN.test(transactionId) ||
    typeof selectedNature !== "string" ||
    !ECONOMIC_NATURE_VALUES.has(selectedNature as EconomicNature)
  ) {
    redirectWithError("A classificação informada é inválida.");
  }

  const supabase = await createClient();
  const { data: transaction, error: readError } = await supabase
    .from("transactions")
    .select("manual_locks")
    .eq("id", transactionId)
    .maybeSingle();

  if (readError || !transaction) {
    redirectWithError("Movimentação não encontrada.");
  }

  const locks = transaction.manual_locks;
  const manualLocks =
    locks && typeof locks === "object" && !Array.isArray(locks)
      ? { ...locks, nature: true }
      : { nature: true };
  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      nature: selectedNature as EconomicNature,
      nature_source: "manual",
      nature_confidence: 1,
      manual_locks: manualLocks,
    })
    .eq("id", transactionId);

  if (updateError) {
    redirectWithError("Não foi possível salvar a natureza econômica.");
  }

  revalidatePath("/movements");
  redirect("/movements?success=Natureza%20econômica%20atualizada.");
}

export async function createTransactionLink(formData: FormData) {
  const fromTransactionId = formData.get("fromTransactionId");
  const toTransactionId = formData.get("toTransactionId");
  const linkType = formData.get("linkType");
  const amount = formData.get("amount");

  if (
    typeof fromTransactionId !== "string" ||
    typeof toTransactionId !== "string" ||
    !UUID_PATTERN.test(fromTransactionId) ||
    !UUID_PATTERN.test(toTransactionId) ||
    fromTransactionId === toTransactionId ||
    typeof linkType !== "string" ||
    !TRANSACTION_LINK_TYPES.has(linkType as TransactionLinkType) ||
    typeof amount !== "string" ||
    !DECIMAL_PATTERN.test(amount)
  ) {
    redirectWithError("O vínculo informado é inválido.");
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    redirect("/login?next=/movements");
  }
  const { error } = await supabase.from("transaction_links").insert({
    user_id: userId,
    from_transaction_id: fromTransactionId,
    to_transaction_id: toTransactionId,
    link_type: linkType as TransactionLinkType,
    amount: Number(amount),
    status: "confirmed",
    confirmed_by_user: true,
  });

  if (error) {
    if (/duplicate key/i.test(error.message)) {
      redirectWithError("Esse vínculo já foi registrado.");
    }
    redirectWithError("Não foi possível registrar o vínculo.");
  }

  revalidatePath("/movements");
  redirect("/movements?success=Vínculo%20de%20conciliação%20registrado.");
}
