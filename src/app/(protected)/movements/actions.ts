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
  const { error: updateError } = await supabase.rpc(
    "set_transaction_nature_manual",
    {
      p_transaction_id: transactionId,
      p_nature: selectedNature as EconomicNature,
    },
  );
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
  const { error } = await supabase.rpc("create_confirmed_transaction_link", {
    p_from_transaction_id: fromTransactionId,
    p_to_transaction_id: toTransactionId,
    p_link_type: linkType as TransactionLinkType,
    p_amount: Number(amount),
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
