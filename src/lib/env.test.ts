import { describe, expect, it } from "vitest";

import { readPublicEnvironment } from "./env";

describe("readPublicEnvironment", () => {
  it("aceita a configuração pública mínima do Supabase", () => {
    expect(
      readPublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
      }),
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "synthetic-public-key",
    });
  });

  it("falha de forma explícita quando uma variável obrigatória está ausente", () => {
    expect(() =>
      readPublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toThrow(/obrigatórias/);
  });

  it("rejeita protocolos não HTTP", () => {
    expect(() =>
      readPublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "file:///tmp/supabase",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
      }),
    ).toThrow(/HTTP ou HTTPS/);
  });
});
