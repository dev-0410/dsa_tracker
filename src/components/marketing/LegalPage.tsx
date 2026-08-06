import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Container } from "@/components/ui";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export function LegalPage({ eyebrow, title, summary, effectiveDate, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#16201A] dark:bg-[#0D120F] dark:text-[#F3F6F0]">
      <PublicHeader />
      <main id="main-content">
        <Container className="py-14 sm:py-20 lg:py-24">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#59655D] underline-offset-4 hover:text-[#16201A] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#A6B0A8] dark:hover:text-white"
          >
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
            Back to Invariant
          </Link>

          <header className="mt-10 max-w-3xl border-b border-[#CBD2CC] pb-10 dark:border-[#323B34]">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#65794B] dark:text-[#C7F269]">{eyebrow}</p>
            <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="mt-6 text-pretty text-base leading-7 text-[#5F6B63] dark:text-[#A6B0A8] sm:text-lg">{summary}</p>
            <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#7A867D] dark:text-[#818D84]">
              Effective {effectiveDate}
            </p>
          </header>

          <div className="mt-12 grid gap-12 lg:grid-cols-[240px_minmax(0,760px)] lg:gap-16">
            <nav aria-label={`${title} sections`} className="self-start lg:sticky lg:top-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A867D] dark:text-[#818D84]">On this page</p>
              <ol className="mt-4 space-y-1 border-l border-[#C9D0CA] pl-4 dark:border-[#3A443D]">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-r-lg px-2 py-2 text-sm font-semibold text-[#657168] hover:bg-white hover:text-[#16201A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#9EA89F] dark:hover:bg-[#1D2520] dark:hover:text-white"
                    >
                      <span className="mr-2 font-mono text-[10px] text-[#879189]">{String(index + 1).padStart(2, "0")}</span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="min-w-0 space-y-12">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-10" aria-labelledby={`${section.id}-title`}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-bold text-[#748078] dark:text-[#7F8B82]">{String(index + 1).padStart(2, "0")}</span>
                    <h2 id={`${section.id}-title`} className="text-2xl font-bold tracking-[-0.035em] text-[#16201A] dark:text-white sm:text-3xl">
                      {section.title}
                    </h2>
                  </div>
                  <div className="mt-5 space-y-4 text-[15px] leading-7 text-[#59655D] dark:text-[#AFB8B1] [&_a]:font-semibold [&_a]:text-[#3157D5] [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-[#AFC0FF] [&_li]:pl-1 [&_strong]:font-bold [&_strong]:text-[#273129] dark:[&_strong]:text-[#EEF2EE] [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
                    {section.content}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </Container>
      </main>
      <PublicFooter />
    </div>
  );
}
