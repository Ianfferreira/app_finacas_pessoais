"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ECONOMIC_NATURE_VALUES } from "@/domain/natures";
import type { EconomicNature } from "@/domain/metrics";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reviewError = (message: string): never =>
  redirect(`/review?error=${encodeURIComponent(message)}`);

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login?next=/review");
  return { supabase, userId };
}

export async function resolveCategoryReview(formData: FormData) {
  const transactionId = formData.get("transactionId");
  const reviewId = formData.get("reviewId");
  const categoryId = formData.get("categoryId");
  if (
    typeof transactionId !== "string" ||
    typeof reviewId !== "string" ||
    typeof categoryId !== "string" ||
    !UUID.test(transactionId) ||
    !UUID.test(reviewId) ||
    !UUID.test(categoryId)
  ) {
    reviewError("A categoria informada é inválida.");
  }
  const validTransactionId = transactionId as string;
  const validReviewId = reviewId as string;
  const validCategoryId = categoryId as string;
  const { supabase, userId } = await currentUserId();
  const { data: tx } = await supabase
    .from("transactions")
    .select("manual_locks")
    .eq("id", validTransactionId)
    .maybeSingle();
  if (!tx) reviewError("Movimentação não encontrada.");
  const locks = tx!.manual_locks;
  const manualLocks =
    locks && typeof locks === "object" && !Array.isArray(locks)
      ? { ...locks, category: true }
      : { category: true };
  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: validCategoryId,
      category_source: "manual",
      category_confidence: 1,
      manual_locks: manualLocks,
    })
    .eq("id", validTransactionId);
  if (error) reviewError("Não foi possível salvar a categoria.");
  await supabase
    .from("review_items")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", validReviewId)
    .eq("transaction_id", validTransactionId);
  await supabase.from("audit_events").insert({
    user_id: userId,
    entity_type: "transaction",
    entity_id: validTransactionId,
    event_type: "category_set_manually",
    payload: { category_id: validCategoryId },
  });
  revalidatePath("/review");
  revalidatePath("/movements");
  redirect(
    "/review?success=Categoria%20salva%20e%20protegida%20contra%20reprocessamento.",
  );
}

export async function resolveNatureReview(formData: FormData) {
  const transactionId = formData.get("transactionId");
  const reviewId = formData.get("reviewId");
  const nature = formData.get("nature");
  if (
    typeof transactionId !== "string" ||
    typeof reviewId !== "string" ||
    typeof nature !== "string" ||
    !UUID.test(transactionId) ||
    !UUID.test(reviewId) ||
    !ECONOMIC_NATURE_VALUES.has(nature as EconomicNature)
  ) {
    reviewError("A natureza informada é inválida.");
  }
  const validTransactionId = transactionId as string;
  const validReviewId = reviewId as string;
  const validNature = nature as EconomicNature;
  const { supabase, userId } = await currentUserId();
  const { data: tx } = await supabase
    .from("transactions")
    .select("manual_locks")
    .eq("id", validTransactionId)
    .maybeSingle();
  if (!tx) reviewError("Movimentação não encontrada.");
  const locks = tx!.manual_locks;
  const manualLocks =
    locks && typeof locks === "object" && !Array.isArray(locks)
      ? { ...locks, nature: true }
      : { nature: true };
  const { error } = await supabase
    .from("transactions")
    .update({
      nature: validNature,
      nature_source: "manual",
      nature_confidence: 1,
      manual_locks: manualLocks,
    })
    .eq("id", validTransactionId);
  if (error) reviewError("Não foi possível salvar a natureza.");
  await supabase
    .from("review_items")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", validReviewId)
    .eq("transaction_id", validTransactionId);
  await supabase.from("audit_events").insert({
    user_id: userId,
    entity_type: "transaction",
    entity_id: validTransactionId,
    event_type: "nature_set_manually",
    payload: { nature: validNature },
  });
  revalidatePath("/review");
  revalidatePath("/movements");
  redirect(
    "/review?success=Natureza%20salva%20e%20protegida%20contra%20reprocessamento.",
  );
}

export async function reprocessReviewTransaction(formData: FormData) {
  const transactionId = formData.get("transactionId");
  if (typeof transactionId !== "string" || !UUID.test(transactionId)) {
    reviewError("Movimentação inválida.");
  }
  const validTransactionId = transactionId as string;
  const { supabase } = await currentUserId();
  const { error } = await supabase.rpc("reprocess_transaction_classification", {
    p_transaction_id: validTransactionId,
  });
  if (error) reviewError("Não foi possível reprocessar a movimentação.");
  revalidatePath("/review");
  redirect(
    "/review?success=Reprocessamento%20concluído%20sem%20alterar%20campos%20manuais.",
  );
}
