import type { InputHTMLAttributes, ReactNode } from "react";
import Image from "next/image";
import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[2rem] border border-saveful-green/35 bg-white px-7 py-7 sm:px-8 sm:py-8">
      {children}
    </div>
  );
}

export function LoginBrand({ badge }: { badge: string }) {
  return (
    <div className="mb-5 text-center">
      <div className="flex justify-center">
        <Image
          src="/logo.png"
          alt="Saveful for Business"
          width={220}
          height={56}
          priority
          className="h-10 w-auto object-contain sm:h-12"
        />
      </div>
      <div className="mt-3 inline-flex rounded-md bg-[#D8E4DC] px-3 py-1 text-[11px] font-saveful-semibold uppercase tracking-[0.16em] text-saveful-green">
        {badge}
      </div>
    </div>
  );
}

export function LoginField({
  id,
  label,
  className,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="font-saveful-semibold text-sm text-[#1a1a1a]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={cn(
            "h-11 w-full rounded-lg border border-black/[0.08] bg-[#F3F2EE] px-3.5 text-[15px] text-[#1a1a1a] outline-none transition placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50",
            trailing ? "pr-10" : null,
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>
        ) : null}
      </div>
    </div>
  );
}

export function LoginSubmit({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-11 w-full rounded-xl bg-saveful-green font-saveful-semibold text-white transition hover:bg-[#244d40] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function LoginTextLink({
  children,
  onClick,
  arrow,
}: {
  children: ReactNode;
  onClick: () => void;
  arrow?: "forward" | "back";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 font-saveful-semibold text-saveful-green underline-offset-4 transition duration-200 hover:text-[#1f4438] hover:underline"
    >
      {arrow === "back" ? (
        <ArrowLeftToLine className="h-3.5 w-3.5 transition duration-200 group-hover:-translate-x-0.5" />
      ) : null}
      <span>{children}</span>
      {arrow === "forward" ? (
        <ArrowRightToLine className="h-3.5 w-3.5 transition duration-200 group-hover:translate-x-0.5" />
      ) : null}
    </button>
  );
}

export function LoginFooter() {
  return (
    <div className="mt-6 text-center text-[11px] leading-relaxed text-gray-500">
      <p>Protected by Saveful Security</p>
      <p className="mt-1">
        <a
          href="https://www.saveful.com/saveful-for-business-terms-conditions"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 transition hover:text-saveful-green hover:underline"
        >
          Terms & Conditions
        </a>
        <span className="mx-1.5 text-gray-300">·</span>
        <a
          href="https://www.saveful.com/privacy-policy"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 transition hover:text-saveful-green hover:underline"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

export function LoginBanner({
  tone,
  message,
}: {
  tone: "error" | "info" | "success";
  message: string;
}) {
  if (!message) return null;
  const style =
    tone === "error"
      ? "border-red-500 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-saveful-green bg-saveful-green/[0.08] text-saveful-green"
        : "border-blue-500 bg-blue-50 text-blue-700";
  return (
    <div className={cn("rounded-xl border-l-4 p-3.5 text-sm font-medium", style)}>
      {message}
    </div>
  );
}
