import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type BadgeVariant = "neutral" | "highlight" | "success" | "warning" | "danger" | "info";

const variants: Record<BadgeVariant, string> = {
  neutral:
    "border-[#D3DAD3] bg-[#F1F3EF] text-[#4F5C53] dark:border-[#3A443D] dark:bg-[#1D2520] dark:text-[#C3CBC5]",
  highlight: "border-[#A7CD42] bg-[#E8F9B9] text-[#354313] dark:bg-[#C7F269] dark:text-[#16201A]",
  success:
    "border-[#A7D7BF] bg-[#E6F5EC] text-[#17633F] dark:border-[#285D43] dark:bg-[#193626] dark:text-[#9EE0B8]",
  warning:
    "border-[#E6C995] bg-[#FFF3DC] text-[#81470E] dark:border-[#6A4820] dark:bg-[#362817] dark:text-[#F2C77E]",
  danger:
    "border-[#EBB4B1] bg-[#FFF0EF] text-[#A52D29] dark:border-[#743633] dark:bg-[#3A201E] dark:text-[#F0AAA6]",
  info:
    "border-[#B8C6F3] bg-[#EEF1FF] text-[#2948B5] dark:border-[#3B4D86] dark:bg-[#1D294C] dark:text-[#AFC0FF]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
