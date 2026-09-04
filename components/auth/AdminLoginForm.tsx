"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdminLoginCredentials } from "@/types/auth";
import { LoginBanner, LoginBrand, LoginCard, LoginField, LoginFooter, LoginSubmit, LoginTextLink } from "./loginChrome";

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
    <LoginCard>
      <LoginBrand badge="Admin" />
      <div className="mb-8 text-center">
        <h1 className="font-saveful-bold text-[1.75rem] leading-tight text-[#1a1a1a] sm:text-[2rem]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Sign in to access the admin workspace.
        </p>
      </div>
      <form
        className="space-y-5"
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
        <LoginBanner tone="error" message={error} />
        <LoginField
          id="admin-email"
          label="Email address"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isLoading}
          autoComplete="email"
        />
        <LoginField
          id="admin-password"
          label="Password"
          placeholder="••••••••"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={isLoading}
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-gray-500 hover:text-saveful-green"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <LoginSubmit disabled={isLoading}>{isLoading ? "Signing in..." : "Sign in"}</LoginSubmit>
      </form>
      {onBack ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          Not an admin?{" "}
          <LoginTextLink onClick={onBack} arrow="back">
            Back to portal selection
          </LoginTextLink>
        </p>
      ) : null}
      <LoginFooter />
    </LoginCard>
  );
}
