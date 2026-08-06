import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "highlight" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#16201A] bg-[#16201A] text-white hover:border-[#2A362E] hover:bg-[#2A362E] dark:border-[#C7F269] dark:bg-[#C7F269] dark:text-[#16201A] dark:hover:border-[#D7FF79] dark:hover:bg-[#D7FF79]",
  secondary:
    "border-[#C9D0CA] bg-white text-[#16201A] hover:border-[#16201A] hover:bg-[#F7F8F5] dark:border-[#3A443D] dark:bg-[#151B17] dark:text-[#F3F6F0] dark:hover:border-[#A6B0A8] dark:hover:bg-[#1D2520]",
  highlight:
    "border-[#B7DD51] bg-[#C7F269] text-[#16201A] hover:border-[#A5CC3D] hover:bg-[#D2F77B]",
  ghost:
    "border-transparent bg-transparent text-[#3F4B43] hover:bg-[#E7EAE5] hover:text-[#16201A] dark:text-[#B8C1BA] dark:hover:bg-[#1D2520] dark:hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
  icon: "h-11 w-11 p-0",
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] border font-semibold tracking-[-0.01em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5] disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
