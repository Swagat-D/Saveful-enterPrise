import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm";
  href?: string;
};

export function buttonClassName({
  variant = "primary",
  size = "default",
  className,
}: Pick<ButtonProps, "variant" | "size" | "className"> = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-saveful-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm",
    {
      "bg-saveful-green text-white hover:bg-green-700": variant === "primary",
      "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50":
        variant === "secondary" || variant === "outline",
      "shadow-none hover:bg-saveful-green/10": variant === "ghost",
    },
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", href, type, ...props }, ref) => {
    const classes = buttonClassName({ variant, size, className });

    if (href) {
      return <Link href={href} className={classes}>{props.children}</Link>;
    }

    return <button ref={ref} type={type ?? "button"} className={classes} {...props} />;
  },
);

Button.displayName = "Button";
