"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { toast } from "sonner";

import { authService } from "@/lib/auth/auth-service";
import { authMessages } from "@/lib/auth/messages";
import { useAuthStore } from "@/stores/auth-store";

function LarkCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      toast.error("Invalid callback parameters");
      router.replace("/login");
      return;
    }

    authService.completeLarkOAuth(code, state).then((result) => {
      if (result.success && result.data) {
        localStorage.setItem("cat_token", result.data.access_token);
        localStorage.setItem("cat_user", JSON.stringify(result.data.user));
        useAuthStore.setState({
          user: result.data.user,
          token: result.data.access_token,
        });
        toast.success("Logged in successfully");
        router.replace("/");
      } else {
        const message = result.errorCode
          ? authMessages[result.errorCode]
          : "Authentication failed";
        toast.error(message);
        router.replace("/login");
      }
    });
  }, [searchParams, router]);

  return (
    <div
      className="fixed inset-0 z-[55] grid place-items-center"
      style={{
        background: "linear-gradient(180deg, #8F6AE0 0%, #FFFFFF 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="h-8 w-8 animate-spin rounded-full border-4 border-white/40 border-t-white"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-white/80">
          Signing in with Lark...
        </p>
      </div>
    </div>
  );
}

export default function LarkCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="fixed inset-0 z-[55] grid place-items-center"
          style={{
            background: "linear-gradient(180deg, #8F6AE0 0%, #FFFFFF 100%)",
          }}
        >
          <span
            className="h-8 w-8 animate-spin rounded-full border-4 border-white/40 border-t-white"
            aria-hidden="true"
          />
        </div>
      }
    >
      <LarkCallbackHandler />
    </Suspense>
  );
}
