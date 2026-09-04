"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ApiError, requestPasswordReset, resetPasswordWithOtp } from "@/lib/api";
import type { LoginFormConfig, LoginCredentials } from "@/types/auth";
import {
  LoginBanner,
  LoginBrand,
  LoginCard,
  LoginField,
  LoginFooter,
  LoginSubmit,
  LoginTextLink,
} from "./loginChrome";

function toUserFacingAuthError(err: unknown) {
  const message = err instanceof Error ? err.message.trim() : "";
  if (
    !message ||
    /TURBOPACK|is not a function|is not a constructor|Cannot read propert/i.test(message)
  ) {
    return "Sign in failed. Please try again.";
  }
  return message;
}

function passwordRules(password: string) {
  return [
    { id: "length", label: "At least 10 characters", ok: password.length >= 10 },
    { id: "upper", label: "1 uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "number", label: "1 number", ok: /\d/.test(password) },
    { id: "special", label: "1 special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

type View = "login" | "forgot" | "verify-otp" | "reset-password" | "forgot-success";

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-gray-500 hover:text-saveful-green"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export function AuthLoginForm({ config }: { config: LoginFormConfig }) {
  const showLogo = config.showLogo !== false;
  const badge = config.badge ?? "Enterprise";
  const [view, setView] = useState<View>("login");
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: config.initialEmail ?? "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(config.initialInfo ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      await config.onSubmit(credentials);
    } catch (err) {
      setError(toUserFacingAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const resetReady = passwordRules(newPassword).every((rule) => rule.ok);

  return (
    <LoginCard>
      {showLogo ? <LoginBrand badge={badge} /> : null}

      {view === "login" ? (
        <>
          <div className="mb-8 text-center">
            <h1 className="font-saveful-bold text-[1.75rem] leading-tight text-[#1a1a1a] sm:text-[2rem]">
              {config.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{config.subtitle}</p>
          </div>
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <LoginBanner tone="error" message={error} />
            <LoginBanner tone={config.initialInfo ? "success" : "info"} message={info} />
            <LoginField
              id="email"
              label="Email address"
              placeholder={config.emailPlaceholder || "Enter your email"}
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
              required
              disabled={isLoading}
              autoComplete="email"
            />
            <LoginField
              id="password"
              label="Password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={credentials.password}
              onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
              required
              disabled={isLoading}
              autoComplete="current-password"
              trailing={
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword((value) => !value)} />
              }
            />
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-gray-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-saveful-green focus:ring-saveful-green"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setForgotEmail(credentials.email);
                  setView("forgot");
                }}
                className="font-saveful-semibold text-saveful-green underline-offset-4 transition duration-200 hover:text-[#1f4438] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <LoginSubmit disabled={isLoading}>{isLoading ? "Signing in..." : "Sign in"}</LoginSubmit>
          </form>
        </>
      ) : null}

      {view === "forgot" ? (
        <>
          <div className="mb-8 text-center">
            <h1 className="font-saveful-bold text-[1.75rem] text-[#1a1a1a]">Request OTP</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your registered email and we’ll send a verification code.
            </p>
          </div>
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setInfo("");
              setIsLoading(true);
              try {
                await requestPasswordReset(forgotEmail);
                setInfo("A reset code was sent. Check your inbox and spam folder.");
                setView("verify-otp");
              } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                  setError(
                    "No active account for that email. If you were invited, open the activation link in your email first.",
                  );
                } else {
                  setError(toUserFacingAuthError(err));
                }
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <LoginBanner tone="error" message={error} />
            <LoginBanner tone="info" message={info} />
            <LoginField
              id="forgot-email"
              label="Email address"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <LoginSubmit disabled={isLoading}>{isLoading ? "Sending..." : "Send OTP"}</LoginSubmit>
            <div className="text-center">
              <LoginTextLink onClick={() => setView("login")} arrow="back">
                Back to sign in
              </LoginTextLink>
            </div>
          </form>
        </>
      ) : null}

      {view === "verify-otp" ? (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (otpCode.length !== 6) {
              setError("Enter the 6-digit code from your email.");
              return;
            }
            setView("reset-password");
          }}
        >
          <div className="mb-2 text-center">
            <h1 className="font-saveful-bold text-[1.75rem] text-[#1a1a1a]">Verify OTP</h1>
            <p className="mt-2 text-sm text-gray-500">Enter the 6-digit OTP sent to {forgotEmail}.</p>
          </div>
          <LoginBanner tone="info" message={info} />
          <LoginBanner tone="error" message={error} />
          <LoginField
            id="otp"
            label="Verification code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-[0.3em]"
            required
          />
          <LoginSubmit disabled={isLoading || otpCode.length !== 6}>
            {isLoading ? "Verifying..." : "Verify OTP"}
          </LoginSubmit>
        </form>
      ) : null}

      {view === "reset-password" ? (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!resetReady) {
              setError("Please meet all password requirements.");
              return;
            }
            if (newPassword !== confirmNewPassword) {
              setError("Passwords do not match.");
              return;
            }
            setIsLoading(true);
            try {
              await resetPasswordWithOtp({
                email: forgotEmail,
                otp: otpCode,
                newPassword,
              });
              setView("forgot-success");
            } catch (err) {
              setError(toUserFacingAuthError(err));
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <h1 className="text-center font-saveful-bold text-[1.75rem] text-[#1a1a1a]">
            Set New Password
          </h1>
          <LoginBanner tone="error" message={error} />
          <LoginField
            id="new-password"
            label="New password"
            type={showNewPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            trailing={
              <PasswordToggle
                show={showNewPassword}
                onToggle={() => setShowNewPassword((value) => !value)}
              />
            }
          />
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
            {passwordRules(newPassword).map((rule) => (
              <li key={rule.id} className={rule.ok ? "text-saveful-green" : undefined}>
                {rule.ok ? "✓" : "○"} {rule.label}
              </li>
            ))}
          </ul>
          <LoginField
            id="confirm-password"
            label="Confirm password"
            type={showConfirmNewPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            trailing={
              <PasswordToggle
                show={showConfirmNewPassword}
                onToggle={() => setShowConfirmNewPassword((value) => !value)}
              />
            }
          />
          <LoginSubmit disabled={isLoading}>{isLoading ? "Resetting..." : "Reset Password"}</LoginSubmit>
        </form>
      ) : null}

      {view === "forgot-success" ? (
        <div className="py-2 text-center">
          <h1 className="mb-2 font-saveful-bold text-[1.75rem] text-[#1a1a1a]">Password updated</h1>
          <p className="mb-8 text-sm text-gray-500">You can now sign in with your new password.</p>
          <button
            type="button"
            onClick={() => setView("login")}
            className="h-12 w-full rounded-xl bg-saveful-green font-saveful-semibold text-white transition hover:bg-[#244d40]"
          >
            Back to sign in
          </button>
        </div>
      ) : null}

      {view === "login" ? (
        <div className="mt-8 space-y-3 text-center text-sm text-gray-500">
          {config.helperText ? <p>{config.helperText}</p> : null}
          {config.onRegister ? (
            <p>
              {config.registerPrompt ?? "Don't have an account?"}{" "}
              <LoginTextLink onClick={config.onRegister} arrow="forward">
                {config.registerActionLabel ?? "Get started"}
              </LoginTextLink>
            </p>
          ) : null}
          {config.onBack ? (
            <p>
              {config.backPrompt ? `${config.backPrompt} ` : null}
              <LoginTextLink onClick={config.onBack} arrow="back">
                {config.backLabel ?? "Back to portal selection"}
              </LoginTextLink>
            </p>
          ) : null}
        </div>
      ) : null}

      <LoginFooter />
    </LoginCard>
  );
}
