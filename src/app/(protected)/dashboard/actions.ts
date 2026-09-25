"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])-01$/;

function targetMonth(formData: FormData): string {
  const month = formData.get("month");
  if (typeof month !== "string" || !MONTH.test(month)) {
    redirect("/dashboard?error=Compet%C3%AAncia%20inv%C3%A1lida.");
  }
  return month;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function closeCurrentMonth(formData: FormData) {
  const supabase = await createClient();
  const month = targetMonth(formData);
  const confirmPending = formData.get("confirmPending") === "true";
  const { error: qualityError } = await supabase.rpc("month_closing_quality", {
    target_month: month,
  });
  if (qualityError) {
    redirect(
      `/dashboard?month=${month.slice(0, 7)}&error=N%C3%A3o%20foi%20poss%C3%ADvel%20conferir%20a%20qualidade%20do%20m%C3%AAs.`,
    );
  }
  const { error } = await supabase.rpc("close_month", {
    target_month: month,
    p_confirm_pending: confirmPending,
  });
  if (error?.code === "22023")
    redirect(
      `/dashboard?month=${month.slice(0, 7)}&error=Existem%20pend%C3%AAncias.%20Confira%20a%20qualidade%20do%20m%C3%AAs%20e%20confirme%20o%20fechamento%20com%20pend%C3%AAncias.`,
    );
  if (error)
    redirect(
      `/dashboard?month=${month.slice(0, 7)}&error=N%C3%A3o%20foi%20poss%C3%ADvel%20fechar%20o%20m%C3%AAs.`,
    );
  revalidatePath("/dashboard");
  redirect(
    `/dashboard?month=${month.slice(0, 7)}&success=Fechamento%20registrado.`,
  );
}

export async function reopenCurrentMonth(formData: FormData) {
  const supabase = await createClient();
  const month = targetMonth(formData);
  const { error } = await supabase.rpc("reopen_month", { target_month: month });
  if (error)
    redirect(
      `/dashboard?month=${month.slice(0, 7)}&error=N%C3%A3o%20foi%20poss%C3%ADvel%20reabrir%20o%20m%C3%AAs.`,
    );
  revalidatePath("/dashboard");
  redirect(
    `/dashboard?month=${month.slice(0, 7)}&success=M%C3%AAs%20reaberto.`,
  );
}
