"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function closeCurrentMonth() {
  const supabase = await createClient();
  const today = new Date();
  const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { error } = await supabase.rpc("close_month", { target_month: month });
  if (error)
    redirect(
      "/dashboard?error=N%C3%A3o%20foi%20poss%C3%ADvel%20fechar%20o%20m%C3%AAs.",
    );
  revalidatePath("/dashboard");
  redirect("/dashboard?success=Fechamento%20registrado.");
}

export async function reopenCurrentMonth() {
  const supabase = await createClient();
  const today = new Date();
  const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { error } = await supabase.rpc("reopen_month", { target_month: month });
  if (error)
    redirect(
      "/dashboard?error=N%C3%A3o%20foi%20poss%C3%ADvel%20reabrir%20o%20m%C3%AAs.",
    );
  revalidatePath("/dashboard");
  redirect("/dashboard?success=M%C3%AAs%20reaberto.");
}
