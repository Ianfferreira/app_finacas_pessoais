"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ECONOMIC_NATURE_VALUES } from "@/domain/natures";
import type { EconomicNature } from "@/domain/metrics";
import { createClient } from "@/lib/supabase/server";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

async function owner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login?next=/rules");
  return { supabase, userId };
}

const ruleError = (message: string): never =>
  redirect(`/rules?error=${encodeURIComponent(message)}`);

export async function createClassificationRule(formData: FormData) {
  const name = formData.get("name");
  const descriptionContains = formData.get("descriptionContains");
  const priority = formData.get("priority");
  const categoryId = formData.get("categoryId");
  const nature = formData.get("nature");
  if (
    typeof name !== "string" ||
    typeof descriptionContains !== "string" ||
    typeof priority !== "string" ||
    !name.trim() ||
    !normalize(descriptionContains) ||
    !/^\d+$/.test(priority) ||
    (typeof categoryId !== "string" && typeof nature !== "string") ||
    (typeof nature === "string" &&
      nature &&
      !ECONOMIC_NATURE_VALUES.has(nature as EconomicNature))
  )
    ruleError("A regra informada é inválida.");
  const validName = name as string;
  const validDescriptionContains = descriptionContains as string;
  const { supabase, userId } = await owner();
  const normalizedCategoryId =
    typeof categoryId === "string" && categoryId ? categoryId : null;
  const normalizedNature =
    typeof nature === "string" && nature ? (nature as EconomicNature) : null;
  if (!normalizedCategoryId && !normalizedNature)
    ruleError("Defina ao menos categoria ou natureza.");
  const { error } = await supabase.from("classification_rules").insert({
    user_id: userId,
    name: validName.trim(),
    description_contains: normalize(validDescriptionContains),
    priority: Number(priority),
    category_id: normalizedCategoryId,
    nature: normalizedNature,
  });
  if (error) ruleError("Não foi possível criar a regra.");
  revalidatePath("/rules");
  redirect("/rules?success=Regra%20criada.");
}

export async function toggleClassificationRule(formData: FormData) {
  const ruleId = formData.get("ruleId");
  const active = formData.get("active");
  if (typeof ruleId !== "string" || typeof active !== "string")
    ruleError("Regra inválida.");
  const { supabase } = await owner();
  const { error } = await supabase
    .from("classification_rules")
    .update({ is_active: active !== "true" })
    .eq("id", ruleId as string);
  if (error) ruleError("Não foi possível atualizar a regra.");
  revalidatePath("/rules");
  redirect("/rules?success=Regra%20atualizada.");
}
