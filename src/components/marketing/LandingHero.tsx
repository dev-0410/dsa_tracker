import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { buttonStyles, Container } from "@/components/ui";
import { RecommendationPreview } from "./RecommendationPreview";

const proofPoints = ["Explainable picks", "Built around your schedule", "No credit card"];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-[#D3DAD3] pb-20 pt-14 dark:border-[#323B34] sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.32] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,112,74,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(96,112,74,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, black, transparent 84%)",
        }}
      />
      <div aria-hidden="true" className="absolute left-[9%] top-0 h-1 w-24 bg-[#C7F269]" />

      <Container className="relative grid items-center gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(540px,1.12fr)] lg:gap-14 xl:gap-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#CCD3CD] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#4C594F] dark:border-[#3A443D] dark:bg-[#151B17] dark:text-[#C3CBC5]">
            <SparklesIcon aria-hidden="true" className="h-4 w-4 text-[#6F8F1C] dark:text-[#C7F269]" />
            Adaptive practice, minus the guesswork
          </div>

          <h1 className="mt-7 text-balance text-[2.75rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#16201A] dark:text-[#F3F6F0] sm:text-6xl lg:text-[4.5rem] xl:text-[5rem]">
            Know exactly what to solve next.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[#56625A] dark:text-[#AEB7B0] sm:text-xl">
            Invariant turns your goals, recent attempts, and topic mastery into a daily problem queue that adapts as you improve.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/login" className={buttonStyles({ variant: "primary", size: "lg" })}>
              Build my practice queue
              <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/#how-it-works" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              <PlayCircleIcon aria-hidden="true" className="h-5 w-5" />
              See how it works
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2" aria-label="Product highlights">
            {proofPoints.map((point) => (
              <li key={point} className="flex items-center gap-1.5 text-sm font-medium text-[#657168] dark:text-[#9DA79F]">
                <CheckCircleIcon aria-hidden="true" className="h-4 w-4 text-[#6C9416] dark:text-[#C7F269]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <RecommendationPreview />
      </Container>
    </section>
  );
}
