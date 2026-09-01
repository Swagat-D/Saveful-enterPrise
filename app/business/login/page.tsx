"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BusinessLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?portal=business");
  }, [router]);

  return null;
}
