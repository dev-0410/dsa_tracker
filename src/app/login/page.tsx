import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignInPanel } from "@/components/marketing";
import { SkipLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google to create your adaptive DSA practice queue.",
};

function SignInFallback() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading sign in"
      className="flex min-h-screen items-center justify-center bg-[#F4F3EE] px-5 dark:bg-[#0D120F]"
    >
      <div className="w-full max-w-md animate-pulse rounded-2xl border border-[#D3DAD3] bg-white p-7 dark:border-[#323B34] dark:bg-[#151B17]">
        <div className="h-3 w-28 rounded bg-[#DCE1DC] dark:bg-[#303A33]" />
        <div className="mt-5 h-10 w-4/5 rounded bg-[#DCE1DC] dark:bg-[#303A33]" />
        <div className="mt-3 h-10 w-3/5 rounded bg-[#DCE1DC] dark:bg-[#303A33]" />
        <div className="mt-8 h-12 w-full rounded-xl bg-[#DCE1DC] dark:bg-[#303A33]" />
      </div>
      <span className="sr-only">Loading sign-in options…</span>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <SkipLink />
      <Suspense fallback={<SignInFallback />}>
        <GoogleSignInPanel />
      </Suspense>
    </>
  );
}
