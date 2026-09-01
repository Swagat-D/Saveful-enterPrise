"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import type { AdminLoginCredentials } from "@/types/auth";

export function AdminLoginForm({
  onSubmit,
  onBack,
}: {
  onSubmit: (credentials: AdminLoginCredentials) => Promise<void> | void;
  onBack?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl md:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#A68FD9]/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-[#E8B4D9]/10" />

      <div className="mb-8 flex justify-center">
        <div className="relative h-16 w-40">
          <Image src="/logo.png" alt="Saveful" fill sizes="160px" className="object-contain" priority />
        </div>
      </div>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#2D5F4F]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2D5F4F]">
          <div className="h-2 w-2 rounded-full bg-[#2D5F4F]" />
          Admin
        </div>
      </div>
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a] md:text-3xl">Welcome back</h2>
        <p className="text-sm text-[#6B6B6B]">Sign in to the admin portal.</p>
      </div>
      <form
        className="space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setIsLoading(true);
          try {
            await onSubmit({ email, password });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setIsLoading(false);
          }
        }}
      >
        {error ? (
          <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isLoading}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <div className="relative">
            <Input
              id="admin-password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isLoading}
              className="pr-20"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#2D5F4F]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button
          className="relative block h-12 w-full rounded-xl bg-gradient-to-r from-[#2D5F4F] to-[#4A8070] font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mx-auto mt-6 block text-sm text-[#6B6B6B] hover:text-[#2D5F4F]"
        >
          Choose a different portal
        </button>
      ) : null}
    </div>
  );
}
