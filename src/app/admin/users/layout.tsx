"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!user && !token) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "admin") {
      router.push("/");
    }
  }, [user, token, router]);

  if (!user || !token) {
    return null;
  }

  if (user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
