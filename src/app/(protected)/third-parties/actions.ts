"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;

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
