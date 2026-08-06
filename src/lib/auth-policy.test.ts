import { describe, expect, it } from "vitest";
import { safeAuthRedirect, shouldAllowGoogleSignIn } from "@/lib/auth-policy";

describe("OAuth policy", () => {
  it("accepts only a verified Google identity when configuration is ready", () => {
    expect(
      shouldAllowGoogleSignIn({
        configurationReady: true,
        provider: "google",
        emailVerified: true,
      }),
    ).toBe(true);
    expect(
      shouldAllowGoogleSignIn({
        configurationReady: true,
        provider: "google",
        emailVerified: false,
      }),
    ).toBe(false);
    expect(
      shouldAllowGoogleSignIn({
        configurationReady: true,
        provider: "github",
        emailVerified: true,
      }),
    ).toBe(false);
    expect(
      shouldAllowGoogleSignIn({
        configurationReady: false,
        provider: "google",
        emailVerified: true,
      }),
    ).toBe(false);
  });

  it("keeps post-auth redirects on the configured origin", () => {
    const baseUrl = "https://invariant.example";
    expect(safeAuthRedirect("/app", baseUrl)).toBe("https://invariant.example/app");
    expect(safeAuthRedirect("https://invariant.example/app/plan", baseUrl)).toBe(
      "https://invariant.example/app/plan",
    );
    expect(safeAuthRedirect("https://attacker.example/phish", baseUrl)).toBe(baseUrl);
    expect(safeAuthRedirect("//attacker.example/phish", baseUrl)).toBe(baseUrl);
    expect(safeAuthRedirect("not a URL", baseUrl)).toBe(baseUrl);
  });
});
