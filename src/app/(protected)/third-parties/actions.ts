"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function redirectWithError(message: string): never {
  redirect(`/third-parties?error=${encodeURIComponent(message)}`);
}

export async function recordThirdPartyEntry(formData: FormData) {
  const personId = formData.get("personId");
  const amount = formData.get("amount");
  const kind = formData.get("kind");
  const note = formData.get("note");
  if (
    typeof personId !== "string" ||
    !UUID.test(personId) ||
    typeof amount !== "string" ||
    !DECIMAL.test(amount) ||
    Number(amount) === 0 ||
    (kind !== "charge" && kind !== "reimbursement") ||
    (note !== null && typeof note !== "string")
  ) {
    redirect("/third-parties?error=Lan%C3%A7amento%20inv%C3%A1lido.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_manual_third_party_entry", {
    p_person_id: personId,
    p_kind: kind,
    p_amount: Number(amount),
    p_note: typeof note === "string" && note.trim() ? note.trim() : undefined,
  });
  if (error)
    redirect(
      "/third-parties?error=N%C3%A3o%20foi%20poss%C3%ADvel%20salvar%20o%20lan%C3%A7amento.",
    );
  revalidatePath("/third-parties");
  redirect("/third-parties?success=Lan%C3%A7amento%20registrado.");
}

export async function recordThirdPartySettlement(formData: FormData) {
  const personId = formData.get("personId");
  const amount = formData.get("amount");
  const occurredOn = formData.get("occurredOn");
  const note = formData.get("note");
  const allocationsInput = formData.get("allocations");
  if (
    typeof personId !== "string" ||
    !UUID.test(personId) ||
    typeof amount !== "string" ||
    !DECIMAL.test(amount) ||
    Number(amount) <= 0 ||
    typeof occurredOn !== "string" ||
    !DATE.test(occurredOn) ||
    typeof note !== "string" ||
    typeof allocationsInput !== "string"
  ) {
    redirectWithError("A liquidação informada é inválida.");
  }

  let allocations: unknown;
  try {
    allocations = JSON.parse(allocationsInput);
  } catch {
    redirectWithError("Não foi possível ler as cobranças selecionadas.");
  }
  if (!Array.isArray(allocations) || allocations.length === 0) {
    redirectWithError("Selecione ao menos uma cobrança para liquidar.");
  }
  const entries = new Set<string>();
  let totalCents = 0;
  const isValid = allocations.every((allocation) => {
    if (
      !allocation ||
      typeof allocation !== "object" ||
      Array.isArray(allocation)
    ) {
      return false;
    }
    const item = allocation as Record<string, unknown>;
    if (
      typeof item.entryId !== "string" ||
      !UUID.test(item.entryId) ||
      entries.has(item.entryId) ||
      typeof item.amount !== "string" ||
      !DECIMAL.test(item.amount) ||
      Number(item.amount) <= 0
    ) {
      return false;
    }
    entries.add(item.entryId);
    totalCents += Math.round(Number(item.amount) * 100);
    return true;
  });
  if (!isValid || totalCents !== Math.round(Number(amount) * 100)) {
    redirectWithError(
      "A distribuição deve fechar exatamente no valor recebido.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_third_party_settlement", {
    p_person_id: personId,
    p_amount: Number(amount),
    p_occurred_on: occurredOn,
    p_note: note.trim(),
    p_allocations: allocations,
  });
  if (error) {
    redirectWithError(
      "Não foi possível registrar a liquidação. Confira os valores ainda em aberto.",
    );
  }
  revalidatePath("/third-parties");
  revalidatePath("/dashboard");
  redirect(
    "/third-parties?success=Liquida%C3%A7%C3%A3o%20registrada%20e%20auditada.",
  );
}
