"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_TYPES = new Set([
  "checking",
  "savings",
  "payment",
  "cash",
  "investment",
  "other",
]);

function settingsError(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

async function owner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login?next=/settings");
  return { supabase, userId };
}

export async function createPerson(formData: FormData) {
  const fullName = formData.get("fullName");
  const relationship = formData.get("relationship");
  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    (relationship !== null && typeof relationship !== "string")
  ) {
    redirect("/settings?error=Dados%20da%20pessoa%20inv%C3%A1lidos.");
  }
  const { supabase, userId } = await owner();
  const { error } = await supabase.from("people").insert({
    user_id: userId,
    full_name: fullName.trim(),
    relationship:
      typeof relationship === "string" && relationship.trim()
        ? relationship.trim()
        : null,
  });
  if (error)
    redirect(
      "/settings?error=N%C3%A3o%20foi%20poss%C3%ADvel%20salvar%20a%20pessoa.",
    );
  revalidatePath("/settings");
  redirect("/settings?success=Pessoa%20adicionada.");
}

export async function createCategory(formData: FormData) {
  const name = formData.get("name");
  const kind = formData.get("kind");
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    (kind !== "expense" && kind !== "income")
  ) {
    settingsError("Dados da categoria inválidos.");
  }
  const { supabase, userId } = await owner();
  const { error } = await supabase.from("categories").insert({
    user_id: userId,
    name: name.trim(),
    kind,
  });
  if (error) settingsError("Não foi possível salvar a categoria.");
  revalidatePath("/settings");
  redirect("/settings?success=Categoria%20adicionada.");
}

export async function createAccount(formData: FormData) {
  const name = formData.get("name");
  const institutionId = formData.get("institutionId");
  const type = formData.get("type");
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 120 ||
    typeof institutionId !== "string" ||
    !UUID.test(institutionId) ||
    typeof type !== "string" ||
    !ACCOUNT_TYPES.has(type)
  ) {
    settingsError("Dados da conta inválidos.");
  }
  const { supabase, userId } = await owner();
  const { error } = await supabase.from("accounts").insert({
    user_id: userId,
    institution_id: institutionId,
    name: name.trim(),
    type: type as "checking",
  });
  if (error) settingsError("Não foi possível salvar a conta.");
  revalidatePath("/settings");
  redirect("/settings?success=Conta%20adicionada.");
}

export async function createCard(formData: FormData) {
  const name = formData.get("name");
  const institutionId = formData.get("institutionId");
  const lastFour = formData.get("lastFour");
  const billingAccountId = formData.get("billingAccountId");
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 120 ||
    typeof institutionId !== "string" ||
    !UUID.test(institutionId) ||
    typeof lastFour !== "string" ||
    (lastFour && !/^\d{4}$/.test(lastFour)) ||
    typeof billingAccountId !== "string" ||
    (billingAccountId && !UUID.test(billingAccountId))
  ) {
    settingsError("Dados do cartão inválidos.");
  }
  const { supabase, userId } = await owner();
  const { error } = await supabase.from("cards").insert({
    user_id: userId,
    institution_id: institutionId,
    name: name.trim(),
    last_four: lastFour || null,
    billing_account_id: billingAccountId || null,
  });
  if (error) settingsError("Não foi possível salvar o cartão.");
  revalidatePath("/settings");
  redirect("/settings?success=Cart%C3%A3o%20adicionado.");
}

export async function deactivateSetting(formData: FormData) {
  const table = formData.get("table");
  const id = formData.get("id");
  if (
    (table !== "categories" &&
      table !== "accounts" &&
      table !== "cards" &&
      table !== "people") ||
    typeof id !== "string" ||
    !UUID.test(id)
  ) {
    settingsError("Cadastro inválido.");
  }
  const { supabase } = await owner();
  const { error } = await supabase
    .from(table)
    .update({ is_active: false })
    .eq("id", id);
  if (error) settingsError("Não foi possível desativar o cadastro.");
  revalidatePath("/settings");
  redirect("/settings?success=Cadastro%20desativado.");
}
