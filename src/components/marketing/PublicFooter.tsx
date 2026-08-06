import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { Container } from "@/components/ui";

const footerLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#recommendations", label: "Recommendations" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-[#D3DAD3] bg-[#F4F3EE] py-10 dark:border-[#323B34] dark:bg-[#0D120F]">
      <Container className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#68746C] dark:text-[#A6B0A8]">
            Deliberate DSA practice, shaped around what you need next.
          </p>
        </div>

        <div className="sm:text-right">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3 sm:justify-end">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded text-sm font-semibold text-[#59655D] underline-offset-4 hover:text-[#16201A] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#A6B0A8] dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-xs text-[#7B867F] dark:text-[#7F8B82]">
            © {new Date().getFullYear()} Invariant. Practice with intent.
          </p>
        </div>
      </Container>
    </footer>
  );
}
