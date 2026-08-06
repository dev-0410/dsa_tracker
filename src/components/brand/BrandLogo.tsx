import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { cn } from "@/components/ui";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  href?: string;
}

export function BrandLogo({ className, compact = false, href = "/" }: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label="Invariant home"
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-lg text-[#16201A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] dark:text-[#F3F6F0]",
        className,
      )}
    >
      <BrandMark />
      {!compact ? (
        <span className="text-xl font-extrabold tracking-[-0.045em]">invariant</span>
      ) : null}
    </Link>
  );
}
