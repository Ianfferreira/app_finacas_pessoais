export type Credentials = {
  email: string;
  password: string;
};

export type CredentialsResult =
  { success: true; data: Credentials } | { success: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCredentials(formData: FormData): CredentialsResult {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    return { success: false, message: "Informe e-mail e senha." };
  }

  const email = rawEmail.trim().toLowerCase();

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { success: false, message: "Informe um e-mail válido." };
  }

  if (rawPassword.length < 8 || rawPassword.length > 128) {
    return {
      success: false,
      message: "A senha deve ter entre 8 e 128 caracteres.",
    };
  }

  return { success: true, data: { email, password: rawPassword } };
}

export function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }

  return value;
}
