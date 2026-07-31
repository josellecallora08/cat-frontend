"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth-store";

export default function AdminScriptsLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  useEffect(() => {
    if (!user && !token) router.push("/login");
    else if (user?.role !== "admin") router.push("/");
  }, [router, token, user]);

  if (!user || !token || user.role !== "admin") return null;
  return <>{children}</>;
}
