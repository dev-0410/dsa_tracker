import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "@/components/brand";
import { buttonStyles, Container } from "@/components/ui";

export function PublicHeader() {
  return (
    <header className="relative z-40 border-b border-[#D3DAD3]/80 bg-[#F4F3EE]/95 dark:border-[#323B34] dark:bg-[#0D120F]/95">
      <Container className="flex h-[72px] items-center justify-between gap-5">
        <BrandLogo />

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          <Link
            href="/#how-it-works"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#59655D] transition-colors hover:bg-white/70 hover:text-[#16201A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#A6B0A8] dark:hover:bg-[#1D2520] dark:hover:text-white"
          >
            How it works
          </Link>
          <Link
            href="/#recommendations"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#59655D] transition-colors hover:bg-white/70 hover:text-[#16201A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#A6B0A8] dark:hover:bg-[#1D2520] dark:hover:text-white"
          >
            Recommendations
          </Link>
          <Link
            href="/#progress"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#59655D] transition-colors hover:bg-white/70 hover:text-[#16201A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#A6B0A8] dark:hover:bg-[#1D2520] dark:hover:text-white"
          >
            Progress
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={buttonStyles({
              variant: "ghost",
              size: "sm",
              className: "hidden sm:inline-flex",
            })}
          >
            Sign in
          </Link>
          <Link href="/login" className={buttonStyles({ variant: "primary", size: "sm" })}>
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start practicing</span>
            <ArrowUpRightIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </header>
  );
}
