"use server";

import { redirect } from "next/navigation";

import {
  parseCredentials,
  safeRedirectPath,
} from "@/features/auth/credentials";
import { createClient } from "@/lib/supabase/server";

function loginUrl(message: string, next: string) {
  const query = new URLSearchParams({ error: message, next });
  return `/login?${query.toString()}`;
}

export async function signIn(formData: FormData) {
  const next = safeRedirectPath(formData.get("next"));
  const parsed = parseCredentials(formData);

  if (!parsed.success) {
    redirect(loginUrl(parsed.message, next));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(loginUrl("Não foi possível entrar com essas credenciais.", next));
  }

  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeRedirectPath(formData.get("next"));
  const parsed = parseCredentials(formData);

  if (!parsed.success) {
    redirect(loginUrl(parsed.message, next));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: new URL(
        `/auth/confirm?next=${encodeURIComponent(next)}`,
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      ).toString(),
    },
  });

  if (error) {
    redirect(loginUrl("Não foi possível criar a conta.", next));
  }

  const query = new URLSearchParams({
    message: "Confira seu e-mail para confirmar o cadastro.",
    next,
  });
  redirect(`/login?${query.toString()}`);
}
