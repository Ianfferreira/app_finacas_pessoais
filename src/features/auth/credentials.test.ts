import { describe, expect, it } from "vitest";

import { parseCredentials, safeRedirectPath } from "./credentials";

function credentialsForm(email: string, password: string) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

describe("parseCredentials", () => {
  it("normaliza um e-mail sintético e preserva a senha", () => {
    expect(
      parseCredentials(
        credentialsForm("  DEV@EXAMPLE.TEST ", "synthetic-pass"),
      ),
    ).toEqual({
      success: true,
      data: { email: "dev@example.test", password: "synthetic-pass" },
    });
  });

  it("rejeita e-mail inválido", () => {
    expect(
      parseCredentials(credentialsForm("invalid", "synthetic-pass")),
    ).toEqual({
      success: false,
      message: "Informe um e-mail válido.",
    });
  });

  it("rejeita senha curta", () => {
    expect(
      parseCredentials(credentialsForm("dev@example.test", "short")),
    ).toEqual({
      success: false,
      message: "A senha deve ter entre 8 e 128 caracteres.",
    });
  });
});

describe("safeRedirectPath", () => {
  it("mantém somente caminhos internos", () => {
    expect(safeRedirectPath("/dashboard?month=2026-01")).toBe(
      "/dashboard?month=2026-01",
    );
    expect(safeRedirectPath("https://example.test/phishing")).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("//example.test/phishing")).toBe("/dashboard");
    expect(safeRedirectPath("/\\example.test/phishing")).toBe("/dashboard");
  });
});
