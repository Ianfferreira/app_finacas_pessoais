"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login?next=/settings");
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
