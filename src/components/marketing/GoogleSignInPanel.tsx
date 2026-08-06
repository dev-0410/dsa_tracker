"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { BrandLogo } from "@/components/brand";
import { Button, Container } from "@/components/ui";

const authErrors: Record<string, string> = {
  AccessDenied: "Google sign-in was cancelled or access was denied. Please try again.",
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method. Use the original method or contact support.",
  OAuthCallback: "Google could not complete the sign-in. Please try again.",
  OAuthCreateAccount: "We could not create your account from Google. Please try again.",
  OAuthSignin: "Google sign-in is temporarily unavailable. Please try again shortly.",
  Configuration: "Sign-in is not configured correctly yet. Please contact support.",
  Default: "We could not sign you in. Please try again.",
};

const setupSteps = [
  { number: "01", title: "Set your target", note: "Role, timeline, and weekly time" },
  { number: "02", title: "Share your baseline", note: "Topics, language, and current level" },
  { number: "03", title: "Get your first queue", note: "A practical session with clear reasoning" },
];

function getSafeCallbackUrl(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }

  return value;
}

export function GoogleSignInPanel() {
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const errorCode = searchParams.get("error");
  const errorMessage = clientError ?? (errorCode ? authErrors[errorCode] ?? authErrors.Default : null);

  const handleGoogleSignIn = async () => {
    setIsPending(true);
    setClientError(null);

    try {
      await signIn("google", { callbackUrl });
    } catch {
      setClientError("Google sign-in could not start. Check your connection and try again.");
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#16201A] dark:bg-[#0D120F] dark:text-[#F3F6F0]">
      <header className="border-b border-[#D3DAD3] dark:border-[#323B34]">
        <Container className="flex h-[72px] items-center justify-between">
          <BrandLogo />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#58645B] transition-colors hover:bg-white hover:text-[#16201A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#A6B0A8] dark:hover:bg-[#1D2520] dark:hover:text-white"
          >
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to overview</span>
          </Link>
        </Container>
      </header>

      <main id="main-content">
        <Container className="grid min-h-[calc(100vh-73px)] items-stretch px-0 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12">
          <section className="relative hidden overflow-hidden border-x border-[#263129] bg-[#16201A] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14" aria-labelledby="setup-preview-title">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(199,242,105,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(199,242,105,0.28) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
                maskImage: "linear-gradient(to bottom right, black, transparent 85%)",
              }}
            />

            <div className="relative max-w-xl pt-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#445147] bg-[#1D2720] px-3 py-1.5 text-xs font-bold text-[#DDE4DE]">
                <SparklesIcon aria-hidden="true" className="h-4 w-4 text-[#C7F269]" />
                A queue that begins with you
              </div>
              <h1 id="setup-preview-title" className="mt-7 text-balance text-4xl font-extrabold leading-[1.03] tracking-[-0.05em] xl:text-5xl">
                A useful recommendation starts with the right context.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#BAC4BC]">
                After sign-in, a short setup turns your goal and available time into a focused first practice session.
              </p>
            </div>

            <ol className="relative mt-12 border-y border-[#3B473E]">
              {setupSteps.map((step, index) => (
                <li
                  key={step.number}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 ${
                    index > 0 ? "border-t border-[#3B473E]" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[#C7F269]">{step.number}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{step.title}</p>
                    <p className="mt-1 text-xs text-[#98A49B]">{step.note}</p>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#4C594F] text-[#C7F269]">
                    <CheckIcon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </li>
              ))}
            </ol>

            <div className="relative mt-10 flex items-center gap-3 rounded-xl border border-[#3C493F] bg-[#1B241E] p-4">
              <ShieldCheckIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#C7F269]" />
              <p className="text-xs leading-5 text-[#B8C2BA]">
                Your connected profile data is private by default and can be disconnected or deleted from settings.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:px-12" aria-labelledby="sign-in-title">
            <div className="w-full max-w-md">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#65794B] dark:text-[#C7F269]">
                Welcome to Invariant
              </p>
              <h1 id="sign-in-title" className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.05em] text-[#16201A] dark:text-white sm:text-[2.75rem] sm:leading-[1.06]">
                Sign in. Set your goal. Start with clarity.
              </h1>
              <p className="mt-5 text-base leading-7 text-[#647068] dark:text-[#A6B0A8]">
                Use Google to create your account or continue where you left off.
              </p>

              {errorMessage ? (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-[#E4ABA8] bg-[#FFF0EF] p-4 text-sm leading-6 text-[#902B27] dark:border-[#743633] dark:bg-[#3A201E] dark:text-[#F2B0AD]"
                >
                  {errorMessage}
                </div>
              ) : null}

              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={handleGoogleSignIn}
                disabled={isPending}
                aria-busy={isPending}
                aria-describedby="sign-in-note"
                className="mt-8 w-full justify-between px-4"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D5DBD6] bg-white font-sans text-base font-extrabold text-[#3157D5] dark:border-[#4A554D]">
                    G
                  </span>
                  {isPending ? "Opening Google…" : "Continue with Google"}
                </span>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
              </Button>

              <p id="sign-in-note" className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#768179] dark:text-[#8F9B92]">
                <LockClosedIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                We use Google for secure account access. We never receive your Google password.
              </p>

              <div className="mt-8 border-t border-[#D3DAD3] pt-6 text-xs leading-5 text-[#768179] dark:border-[#323B34] dark:text-[#8F9B92]">
                By continuing, you agree to the{" "}
                <Link href="/terms" className="font-semibold text-[#354C92] underline underline-offset-2 hover:text-[#203977] dark:text-[#AFC0FF]">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/privacy" className="font-semibold text-[#354C92] underline underline-offset-2 hover:text-[#203977] dark:text-[#AFC0FF]">
                  Privacy Policy
                </Link>
                .
              </div>
            </div>
          </section>
        </Container>
      </main>
    </div>
  );
}
