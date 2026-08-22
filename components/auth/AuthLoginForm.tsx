"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import type { LoginFormConfig, LoginCredentials } from "@/types/auth";

type View = "login" | "forgot" | "verify-otp" | "reset-password" | "forgot-success";

function BottomGradient() {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-[#A68FD9] to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-[#F7931E] to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
}

function LabelInputContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex w-full flex-col space-y-2", className)}>{children}</div>;
}

function Banner({
  tone,
  message,
}: {
  tone: "error" | "info";
  message: string;
}) {
  if (!message) return null;
  const isError = tone === "error";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border-l-4 p-4",
        isError ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50",
      )}
    >
      <p className={cn("text-sm font-medium", isError ? "text-red-700" : "text-blue-700")}>
        {message}
      </p>
    </div>
  );
}

export function AuthLoginForm({ config }: { config: LoginFormConfig }) {
  const [view, setView] = useState<View>("login");
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      await config.onSubmit(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const wait = () => new Promise((resolve) => setTimeout(resolve, 400));

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl md:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#A68FD9]/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-[#E8B4D9]/10" />

      <div className="mb-8 flex justify-center">
        <div className="relative h-16 w-40">
          <Image src="/logo.png" alt="Saveful Logo" fill sizes="160px" className="object-contain" priority />
        </div>
      </div>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#2D5F4F]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2D5F4F]">
          <div className="h-2 w-2 rounded-full bg-[#2D5F4F]" />
          Enterprise
        </div>
      </div>

      {view === "login" ? (
        <>
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a] md:text-3xl">{config.title}</h2>
            <p className="text-sm text-[#6B6B6B]">{config.subtitle}</p>
          </div>
          <form className="space-y-6" onSubmit={handleLoginSubmit}>
            <Banner tone="error" message={error} />
            <LabelInputContainer>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder={config.emailPlaceholder || "Enter your email"}
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={isLoading}
                className="pl-4"
              />
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  disabled={isLoading}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 pr-4 text-[#6B6B6B] hover:text-[#2D5F4F]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </LabelInputContainer>
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#2D5F4F] focus:ring-[#2D5F4F]"
                />
                <span className="text-[#6B6B6B]">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setForgotEmail(credentials.email);
                  setView("forgot");
                }}
                className="font-medium text-[#2D5F4F] hover:text-[#4A8070]"
              >
                Forgot password?
              </button>
            </div>
            <button
              className="group/btn relative block h-12 w-full rounded-xl bg-gradient-to-r from-[#2D5F4F] to-[#4A8070] font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
              <BottomGradient />
            </button>
          </form>
        </>
      ) : null}

      {view === "forgot" ? (
        <>
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a]">Request OTP</h2>
            <p className="text-sm text-[#6B6B6B]">
              Enter your registered email and we’ll send a verification code.
            </p>
          </div>
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              await wait();
              setInfo("OTP sent. Please check your inbox and spam folder.");
              setView("verify-otp");
              setIsLoading(false);
            }}
          >
            <Banner tone="error" message={error} />
            <Banner tone="info" message={info} />
            <LabelInputContainer>
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </LabelInputContainer>
            <button
              className="group/btn relative block h-12 w-full rounded-xl bg-gradient-to-r from-[#2D5F4F] to-[#4A8070] font-semibold text-white"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send OTP"}
              <BottomGradient />
            </button>
            <button
              type="button"
              onClick={() => setView("login")}
              className="mx-auto block text-sm text-[#6B6B6B] hover:text-[#2D5F4F]"
            >
              Back to sign in
            </button>
          </form>
        </>
      ) : null}

      {view === "verify-otp" ? (
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setIsLoading(true);
            await wait();
            setView("reset-password");
            setIsLoading(false);
          }}
        >
          <div className="mb-2 text-center">
            <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a]">Verify OTP</h2>
            <p className="text-sm text-[#6B6B6B]">
              Enter the 6-digit OTP sent to {forgotEmail}.
            </p>
          </div>
          <Banner tone="info" message={info} />
          <Input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-[0.3em]"
            required
          />
          <button
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#2D5F4F] to-[#4A8070] font-semibold text-white"
            disabled={isLoading || otpCode.length !== 6}
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      ) : null}

      {view === "reset-password" ? (
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newPassword !== confirmNewPassword) {
              setError("Passwords do not match.");
              return;
            }
            setIsLoading(true);
            await wait();
            setView("forgot-success");
            setIsLoading(false);
          }}
        >
          <h2 className="text-center text-2xl font-bold text-[#1a1a1a]">Set New Password</h2>
          <Banner tone="error" message={error} />
          <Input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
          <button
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#2D5F4F] to-[#4A8070] font-semibold text-white"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      ) : null}

      {view === "forgot-success" ? (
        <div className="py-4 text-center">
          <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a]">Password updated</h2>
          <p className="mb-8 text-sm text-[#6B6B6B]">You can now sign in with your new password.</p>
          <button
            type="button"
            onClick={() => setView("login")}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#2D5F4F] to-[#4A8070] font-semibold text-white"
          >
            Back to sign in
          </button>
        </div>
      ) : null}

      <div className="mt-8 text-center">
        <p className="text-xs text-[#6B6B6B]">
          As well as protected by Saveful Security ·<br />
          <a href="https://www.saveful.com/saveful-for-business-terms-conditions" 
            target="_blank" 
            className="font-medium text-[#2D5F4F] hover:underline">
            Terms and Conditions {". "}
          </a>
          <a href="https://www.saveful.com/privacy-policy" target="_blank" className="font-medium text-[#2D5F4F] hover:underline">
            Privacy Policy {" "}
          </a>
        </p>
      </div>
    </div>
  );
}
