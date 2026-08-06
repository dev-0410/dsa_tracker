import { VariableIcon } from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#16201A] text-[#C7F269] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:bg-[#C7F269] dark:text-[#16201A]",
        className,
      )}
    >
      <VariableIcon className="h-5 w-5" strokeWidth={2.2} />
    </span>
  );
}
