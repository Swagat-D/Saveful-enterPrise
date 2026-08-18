import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function FormField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <p className="font-saveful text-xs leading-relaxed text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:flex-wrap">
      {children}
    </div>
  );
}

const selectClass =
  "shadow-input flex h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 text-sm text-[#1a1a1a] transition-all duration-300 focus:border-[#A68FD9] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A68FD9]/20";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(selectClass, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "shadow-input min-h-28 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 py-3 text-sm text-[#1a1a1a] transition-all duration-300 placeholder:text-[#6B6B6B]/50 focus:border-[#A68FD9] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A68FD9]/20",
        className,
      )}
      {...props}
    />
  );
}
