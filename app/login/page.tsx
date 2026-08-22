"use client";

import { useRouter } from "next/navigation";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
import { LoginBackdrop } from "@/components/auth/LoginBackdrop";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF7F0]">
      <LoginBackdrop />
      <div className="relative z-10">
        <AuthLoginForm
          config={{
            title: "Welcome back",
            subtitle: "Sign in to manage your organisation, sites and impact.",
            emailPlaceholder: "you@yourbusiness.com",
            onSubmit: async (credentials) => {
              await login(credentials);
              router.push("/dashboard");
            },
          }}
        />
      </div>
    </div>
  );
}
