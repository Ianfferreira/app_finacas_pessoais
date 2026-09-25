"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ECONOMIC_NATURE_VALUES } from "@/domain/natures";
import type { EconomicNature } from "@/domain/metrics";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.generated";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d+(?:\.\d{1,6})?$/;
const reviewError = (message: string): never =>
  redirect(`/review?error=${encodeURIComponent(message)}`);

function ownershipDestination(formData: FormData) {
  return formData.get("returnTo") === "/movements" ? "/movements" : "/review";
}

function ownershipError(message: string, formData: FormData): never {
  redirect(
    `${ownershipDestination(formData)}?error=${encodeURIComponent(message)}`,
  );
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?next=/review");
  return { supabase };
}

export async function resolveCategoryReview(formData: FormData) {
  const transactionId = formData.get("transactionId");
  const categoryId = formData.get("categoryId");
  if (
    typeof transactionId !== "string" ||
    typeof categoryId !== "string" ||
    !UUID.test(transactionId) ||
    !UUID.test(categoryId)
  ) {
    reviewError("A categoria informada é inválida.");
  }
  const validTransactionId = transactionId as string;
  const validCategoryId = categoryId as string;
  const { supabase } = await currentUserId();
  const { error } = await supabase.rpc("set_transaction_category_manual", {
    p_transaction_id: validTransactionId,
    p_category_id: validCategoryId,
  });
  if (error)
    reviewError(
      "Não foi possível salvar a categoria. Confira se ela é compatível com a natureza da movimentação.",
    );
  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  redirect(
    "/review?success=Categoria%20salva%20e%20protegida%20contra%20reprocessamento.",
  );
}

export async function resolveNatureReview(formData: FormData) {
  const transactionId = formData.get("transactionId");
  const nature = formData.get("nature");
  if (
    typeof transactionId !== "string" ||
    typeof nature !== "string" ||
    !UUID.test(transactionId) ||
    !ECONOMIC_NATURE_VALUES.has(nature as EconomicNature)
  ) {
    reviewError("A natureza informada é inválida.");
  }
  const validTransactionId = transactionId as string;
  const validNature = nature as EconomicNature;
  const { supabase } = await currentUserId();
  const { error } = await supabase.rpc("set_transaction_nature_manual", {
    p_transaction_id: validTransactionId,
    p_nature: validNature,
  });
  if (error) reviewError("Não foi possível salvar a natureza econômica.");
  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
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

export async function setTransactionOwnership(formData: FormData) {
  const transactionId = formData.get("transactionId");
  const mode = formData.get("mode");
  const allocationsInput = formData.get("allocations");
  if (
    typeof transactionId !== "string" ||
    !UUID.test(transactionId) ||
    (mode !== "amount" && mode !== "percentage") ||
    typeof allocationsInput !== "string"
  ) {
    ownershipError("O rateio informado é inválido.", formData);
  }

  const validTransactionId = transactionId as string;
  const validMode = mode as "amount" | "percentage";
  const validAllocationsInput = allocationsInput as string;
  let parsedAllocations: unknown;
  try {
    parsedAllocations = JSON.parse(validAllocationsInput);
  } catch {
    ownershipError("Não foi possível ler o rateio informado.", formData);
  }
  if (!Array.isArray(parsedAllocations) || parsedAllocations.length === 0) {
    ownershipError("Informe ao menos uma parte do rateio.", formData);
  }
  const allocations = parsedAllocations as unknown[];

  let selfCount = 0;
  const people = new Set<string>();
  const isValid = allocations.every((allocation: unknown) => {
    if (
      !allocation ||
      typeof allocation !== "object" ||
      Array.isArray(allocation)
    ) {
      return false;
    }
    const item = allocation as Record<string, unknown>;
    if (item.ownerType === "self") {
      selfCount += 1;
      return (
        selfCount === 1 &&
        item.personId === undefined &&
        typeof item[validMode] === "string" &&
        DECIMAL.test(item[validMode] as string)
      );
    }
    if (
      item.ownerType !== "third_party" ||
      typeof item.personId !== "string" ||
      !UUID.test(item.personId) ||
      people.has(item.personId) ||
      typeof item[validMode] !== "string" ||
      !DECIMAL.test(item[validMode] as string)
    ) {
      return false;
    }
    people.add(item.personId);
    return true;
  });
  if (!isValid) {
    ownershipError(
      "Cada parte precisa ter valor válido; pessoas não podem se repetir.",
      formData,
    );
  }

  const { supabase } = await currentUserId();
  const { error } = await supabase.rpc("set_transaction_ownership", {
    p_transaction_id: validTransactionId,
    p_mode: validMode,
    p_allocations: allocations as Json,
  });
  if (error) {
    ownershipError(
      "Não foi possível salvar o rateio. Confira as partes e tente novamente.",
      formData,
    );
  }
  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/third-parties");
  revalidatePath("/dashboard");
  redirect(
    `${ownershipDestination(formData)}?success=Titularidade%20e%20rateio%20salvos.`,
  );
}

export async function confirmPossibleDuplicateCandidate(formData: FormData) {
  const candidateId = formData.get("candidateId");
  const canonicalTransactionId = formData.get("canonicalTransactionId");
  if (
    typeof candidateId !== "string" ||
    typeof canonicalTransactionId !== "string" ||
    !UUID.test(candidateId) ||
    !UUID.test(canonicalTransactionId)
  ) {
    reviewError("A decisão sobre a duplicidade é inválida.");
  }
  const validCandidateId = candidateId as string;
  const validCanonicalTransactionId = canonicalTransactionId as string;
  const { supabase } = await currentUserId();
  const { error } = await supabase.rpc("confirm_possible_duplicate_candidate", {
    p_candidate_id: validCandidateId,
    p_canonical_transaction_id: validCanonicalTransactionId,
  });
  if (error) {
    reviewError(
      "Não foi possível confirmar a duplicidade. Atualize a página e confira as duas movimentações.",
    );
  }
  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  redirect(
    "/review?success=Duplicidade%20confirmada.%20A%20movimenta%C3%A7%C3%A3o%20n%C3%A3o%20can%C3%B4nica%20foi%20marcada%20como%20duplicada,%20sem%20apagar%20a%20origem.",
  );
}

export async function dismissPossibleDuplicateCandidate(formData: FormData) {
  const candidateId = formData.get("candidateId");
  if (typeof candidateId !== "string" || !UUID.test(candidateId)) {
    reviewError("A decisão sobre a duplicidade é inválida.");
  }
  const validCandidateId = candidateId as string;
  const { supabase } = await currentUserId();
  const { error } = await supabase.rpc("dismiss_possible_duplicate_candidate", {
    p_candidate_id: validCandidateId,
  });
  if (error) {
    reviewError("Não foi possível descartar essa possível duplicidade.");
  }
  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  redirect("/review?success=Poss%C3%ADvel%20duplicidade%20descartada.");
}
