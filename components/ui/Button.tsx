import { type ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const variantClass: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-marker text-white border-marker hover:bg-marker-deep hover:border-marker-deep",
  secondary: "border-paper-edge bg-surface text-ink hover:border-ink/40",
  ghost: "bg-transparent text-muted border-transparent hover:text-ink hover:bg-ink/5",
  danger: "bg-danger text-white border-danger hover:opacity-90",
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "min-h-10 px-3.5 py-1.5 text-[13px]",
  md: "min-h-11 px-5 py-2.5 text-base",
  lg: "min-h-12 px-7 py-3.5 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 font-semibold tracking-wide transition-all duration-150 ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? "w-full" : ""} ${
        disabled ? "opacity-40 cursor-not-allowed" : "active:scale-[0.98]"
      } ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}