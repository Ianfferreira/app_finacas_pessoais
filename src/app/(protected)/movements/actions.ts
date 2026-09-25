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

function movementDestination(formData: FormData) {
  return formData.get("returnTo") === "/movements"
    ? "/movements"
    : "/movements";
}

function redirectWithError(message: string, formData: FormData): never {
  redirect(
    `${movementDestination(formData)}?error=${encodeURIComponent(message)}`,
  );
}

function natureErrorMessage(message: string) {
  if (
    /could not find.*set_transaction_nature_manual|function.*does not exist/i.test(
      message,
    )
  ) {
    return "A atualização do banco ainda não foi aplicada. Execute as migrations antes de salvar a natureza.";
  }
  if (/authentication|required|permission/i.test(message)) {
    return "Sua sessão expirou. Entre novamente e tente salvar a natureza.";
  }
  return "Não foi possível salvar a natureza econômica. Tente novamente.";
}

function reconciliationErrorMessage(message: string) {
  if (/could not find.*function|function.*does not exist/i.test(message)) {
    return "A atualização de conciliação ainda não foi aplicada no banco.";
  }
  if (/exceeds|greater than|invalid|not an active/i.test(message)) {
    return "O valor não é compatível com a movimentação ou a fatura selecionada.";
  }
  return "Não foi possível registrar a conciliação. Tente novamente.";
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
    redirectWithError("A classificação informada é inválida.", formData);
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
    redirectWithError(natureErrorMessage(updateError.message), formData);
  }

  revalidatePath("/movements");
  redirect(
    `${movementDestination(formData)}?success=Natureza%20econômica%20atualizada.`,
  );
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
    redirectWithError("O vínculo informado é inválido.", formData);
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
      redirectWithError("Esse vínculo já foi registrado.", formData);
    }
    redirectWithError("Não foi possível registrar o vínculo.", formData);
  }

  revalidatePath("/movements");
  redirect(
    `${movementDestination(formData)}?success=Vínculo%20de%20conciliação%20registrado.`,
  );
}

export async function dismissReconciliationCandidate(formData: FormData) {
  const candidateId = formData.get("candidateId");
  if (typeof candidateId !== "string" || !UUID_PATTERN.test(candidateId)) {
    redirectWithError("A sugestão de conciliação é inválida.", formData);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("dismiss_reconciliation_candidate", {
    p_candidate_id: candidateId,
  });
  if (error) {
    redirectWithError(reconciliationErrorMessage(error.message), formData);
  }
  revalidatePath("/movements");
  revalidatePath("/review");
  revalidatePath("/dashboard");
  redirect(
    `${movementDestination(formData)}?success=Sugestão%20de%20conciliação%20descartada.`,
  );
}

export async function recordCardStatementPaymentAllocation(formData: FormData) {
  const statementId = formData.get("statementId");
  const paymentTransactionId = formData.get("paymentTransactionId");
  const amount = formData.get("amount");
  if (
    typeof statementId !== "string" ||
    typeof paymentTransactionId !== "string" ||
    !UUID_PATTERN.test(statementId) ||
    !UUID_PATTERN.test(paymentTransactionId) ||
    typeof amount !== "string" ||
    !DECIMAL_PATTERN.test(amount) ||
    Number(amount) <= 0
  ) {
    redirectWithError(
      "A alocação de pagamento informada é inválida.",
      formData,
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "record_card_statement_payment_allocation",
    {
      p_card_statement_id: statementId,
      p_payment_transaction_id: paymentTransactionId,
      p_amount: Number(amount),
    },
  );
  if (error) {
    redirectWithError(reconciliationErrorMessage(error.message), formData);
  }
  revalidatePath("/movements");
  revalidatePath("/review");
  revalidatePath("/dashboard");
  redirect(
    `${movementDestination(formData)}?success=Pagamento%20vinculado%20à%20fatura.`,
  );
}

export async function removeCardStatementPaymentAllocation(formData: FormData) {
  const allocationId = formData.get("allocationId");
  if (typeof allocationId !== "string" || !UUID_PATTERN.test(allocationId)) {
    redirectWithError("A conciliação selecionada é inválida.", formData);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "remove_card_statement_payment_allocation",
    { p_allocation_id: allocationId },
  );
  if (error) {
    redirectWithError(reconciliationErrorMessage(error.message), formData);
  }
  revalidatePath("/movements");
  revalidatePath("/review");
  revalidatePath("/dashboard");
  redirect(
    `${movementDestination(formData)}?success=Conciliação%20de%20pagamento%20removida.`,
  );
}
