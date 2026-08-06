import type { Metadata } from "next";
import { LandingHero, LandingSections, PublicFooter, PublicHeader } from "@/components/marketing";
import { SkipLink } from "@/components/ui";

export const metadata: Metadata = {
  title: { absolute: "Invariant — Know what to solve next" },
  description:
    "Adaptive, explainable DSA practice built around your goals, available time, and topic mastery.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F3EE] font-sans text-[#16201A] antialiased dark:bg-[#0D120F] dark:text-[#F3F6F0]">
      <SkipLink />
      <PublicHeader />
      <main id="main-content">
        <LandingHero />
        <LandingSections />
      </main>
      <PublicFooter />
    </div>
  );
}
