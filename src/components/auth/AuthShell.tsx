"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type { AuthView, AuthStatus, AuthFieldErrors } from "@/lib/auth/types";
import { authMessages } from "@/lib/auth/messages";
import { validateLogin, validateSignup, validateReset } from "@/lib/auth/validation";
import { authService } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { MascotLoader } from "./MascotLoader";
import { CatMascotSvg } from "./CatMascotSvg";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ResetPasswordForm } from "./ResetPasswordForm";

type AppPhase = "auth" | "loading";

export function AuthShell() {
  const router = useRouter();
  const [phase, setPhase] = useState<AppPhase>("auth");
  const [view, setView] = useState<AuthView>("login");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [buttonMessage, setButtonMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const authPageRef = useRef<HTMLDivElement>(null);
  const authContentRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  // After login, the loader plays then navigates to dashboard
  const handleLoaderComplete = useCallback(() => {
    // Signal the dashboard to play the reveal animation
    sessionStorage.setItem("cat_reveal_dashboard", "1");
    router.push("/");
  }, [router]);

  // Clear errors when user edits a field
  const handleFieldChange = useCallback(() => {
    if (status === "error") {
      setStatus("idle");
      setFieldErrors({});
      setButtonMessage("");
    }
  }, [status]);

  // Change auth view
  const switchView = useCallback((newView: AuthView) => {
    setView(newView);
    setStatus("idle");
    setFieldErrors({});
    setButtonMessage("");
    setResetSent(false);
  }, []);

  // Login handler
  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const validation = validateLogin(email, password);
      if (!validation.valid) {
        setStatus("error");
        setFieldErrors(validation.fieldErrors);
        setButtonMessage(validation.buttonMessage);
        return;
      }

      setStatus("submitting");
      const result = await authService.login(email, password);

      if (!result.success) {
        setStatus("error");
        const code = result.errorCode!;
        setButtonMessage(authMessages[code]);
        if (code === "INVALID_CREDENTIALS") {
          setFieldErrors({ email: " ", password: " " });
        }
        return;
      }

      // Store auth data
      if (result.data) {
        localStorage.setItem("cat_token", result.data.access_token);
        localStorage.setItem("cat_user", JSON.stringify(result.data.user));
        useAuthStore.setState({
          user: result.data.user,
          token: result.data.access_token,
        });
      }

      setStatus("success");
      playSuccessAnimation();

      // Show loading screen, then navigate to dashboard
      setTimeout(() => {
        setPhase("loading");
      }, 1200);
    },
    [router]
  );

  // Signup handler
  const handleSignup = useCallback(
    async (email: string, password: string, fullName: string) => {
      const validation = validateSignup(email, password);
      if (!validation.valid) {
        setStatus("error");
        setFieldErrors(validation.fieldErrors);
        setButtonMessage(validation.buttonMessage);
        return;
      }

      if (!fullName) {
        setStatus("error");
        setFieldErrors({ firstName: " " });
        setButtonMessage("Please enter your name");
        return;
      }

      setStatus("submitting");
      const result = await authService.signup(email, password, fullName);

      if (!result.success) {
        setStatus("error");
        setButtonMessage(authMessages[result.errorCode!]);
        return;
      }

      // Switch to login with success message
      setStatus("idle");
      switchView("login");
      // Brief delay then show success state on the login button
      setTimeout(() => {
        setButtonMessage("");
      }, 100);
    },
    [switchView]
  );

  // Reset handler
  const handleReset = useCallback(
    async (email: string) => {
      const validation = validateReset(email);
      if (!validation.valid) {
        setStatus("error");
        setFieldErrors(validation.fieldErrors);
        setButtonMessage(validation.buttonMessage);
        return;
      }

      setStatus("submitting");
      await authService.requestPasswordReset(email);

      setStatus("idle");
      setResetSent(true);
    },
    []
  );

  // Social login handlers
  const handleGoogle = useCallback(async () => {
    setStatus("submitting");
    const result = await authService.loginWithGoogle();
    if (!result.success) {
      setStatus("error");
      setButtonMessage(authMessages[result.errorCode!]);
      return;
    }
    setStatus("success");
    playSuccessAnimation();
  }, []);

  const handleLark = useCallback(async () => {
    setStatus("submitting");
    const result = await authService.loginWithLark();
    if (!result.success) {
      setStatus("error");
      setButtonMessage(authMessages[result.errorCode!]);
      return;
    }
    setStatus("success");
    playSuccessAnimation();
  }, []);

  // Success animation with stars
  const playSuccessAnimation = useCallback(() => {
    const mascot = mascotRef.current;
    const starsEl = starsRef.current;
    if (!mascot || !starsEl) return;

    const stars = starsEl.querySelectorAll(".success-star");
    const svg = mascot.querySelector("svg");

    gsap.killTweensOf([stars, svg]);
    gsap.set(stars, { autoAlpha: 0, scale: 0, rotation: -28, y: 6 });

    gsap.timeline()
      .to(svg, { scale: 1.08, y: -8, duration: 0.22, ease: "back.out(2)" })
      .to(stars, {
        autoAlpha: 1, scale: 1, rotation: 0, y: 0,
        duration: 0.28, stagger: 0.08, ease: "back.out(2.2)",
      }, "-=0.08")
      .to(svg, { scale: 1, y: 0, duration: 0.34, ease: "elastic.out(1, 0.45)" }, "-=0.1")
      .to(stars, {
        scale: 1.22, rotation: 18, duration: 0.42,
        repeat: -1, yoyo: true,
        stagger: { each: 0.11, repeat: -1, yoyo: true },
        ease: "sine.inOut",
      }, "-=0.18");
  }, []);

  // If user is already logged in, redirect
  useEffect(() => {
    const token = localStorage.getItem("cat_token");
    const user = localStorage.getItem("cat_user");
    if (token && user) {
      router.replace("/");
    }
  }, [router]);

  // Brief, smooth GSAP entrance for the login dock
  useEffect(() => {
    if (phase !== "auth" || !authContentRef.current) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const children = Array.from(authContentRef.current.children);
    const ctx = gsap.context(() => {
      gsap.set(authPageRef.current, { opacity: 0 });
      gsap.to(authPageRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" });
      gsap.from(children, {
        y: 18,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
        stagger: 0.08,
        delay: 0.1,
      });
    });
    return () => ctx.revert();
  }, [phase]);

  return (
    <>
      {/* Loading phase — shown AFTER successful login, before dashboard */}
      {phase === "loading" && <MascotLoader onComplete={handleLoaderComplete} />}

      {/* Auth page (role select + login form) — shown immediately */}
      <div
        ref={authPageRef}
        className="fixed inset-0 z-[55] grid place-items-center overflow-auto"
        style={{
          background: "linear-gradient(180deg, #8F6AE0 0%, #FFFFFF 100%)",
          visibility: phase === "auth" ? "visible" : "hidden",
        }}
      >
        <div
          ref={authContentRef}
          className="auth-content w-[min(100%,520px)] md:w-[clamp(440px,38vw,560px)] grid place-items-center gap-0 text-center mx-auto"
          style={{
            paddingTop: "24px",
            paddingBottom: "24px",
            paddingInline: "clamp(24px, 6vw, 32px)",
            fontFamily: '"SF Compact Rounded", "SF Pro Rounded", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif',
          }}
        >
          {/* Header: Mascot + Title inline */}
          <div className="flex items-center gap-3 md:gap-4 mb-1">
            <div
              ref={mascotRef}
              className="relative shrink-0 w-[60px] md:w-[72px] h-auto"
            >
              <div ref={starsRef} aria-hidden="true" className="absolute inset-0 z-10">
                <span className="success-star absolute left-[-10%] top-[30%] w-[14px] h-[14px] opacity-0 pointer-events-none origin-center before:absolute before:inset-[5px_1px] before:rounded-full before:bg-[#fff200] after:absolute after:inset-[5px_1px] after:rounded-full after:bg-[#fff200] after:rotate-90" />
                <span className="success-star absolute left-[52%] top-[-6%] w-[12px] h-[12px] opacity-0 pointer-events-none origin-center before:absolute before:inset-[4px_1px] before:rounded-full before:bg-[#fff200] after:absolute after:inset-[4px_1px] after:rounded-full after:bg-[#fff200] after:rotate-90" />
                <span className="success-star absolute right-[-12%] top-[40%] w-[14px] h-[14px] opacity-0 pointer-events-none origin-center before:absolute before:inset-[5px_1px] before:rounded-full before:bg-[#fff200] after:absolute after:inset-[5px_1px] after:rounded-full after:bg-[#fff200] after:rotate-90" />
              </div>
              <CatMascotSvg className="w-full h-auto" id="auth" />
            </div>
            <h1
              className="m-0 text-[clamp(40px,8vw,56px)] md:text-[clamp(56px,5vw,72px)] leading-[1] font-extrabold text-[#2B2339]"
              style={{ fontFamily: "inherit" }}
            >
              CATS
            </h1>
          </div>
          <p className="m-0 mb-[clamp(20px,3svh,32px)] md:mb-6 text-[10px] md:text-[12px] font-medium opacity-90 text-[#2B2339]">
            AI-powered Collection Agent Training System
          </p>

          {/* Auth forms */}
          <div className="w-full max-w-[342px] md:max-w-[360px] grid gap-[10px] md:gap-[14px]">
            {/* Live region for screen readers */}
            <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
              {status === "error" && buttonMessage}
            </div>

            {view === "login" && (
              <LoginForm
                status={status}
                fieldErrors={fieldErrors}
                buttonMessage={buttonMessage}
                onSubmit={handleLogin}
                onForgotPassword={() => switchView("reset")}
                onSignup={() => switchView("signup")}
                onGoogle={handleGoogle}
                onLark={handleLark}
                onFieldChange={handleFieldChange}
              />
            )}

            {view === "signup" && (
              <SignupForm
                status={status}
                fieldErrors={fieldErrors}
                buttonMessage={buttonMessage}
                onSubmit={handleSignup}
                onLogin={() => switchView("login")}
                onFieldChange={handleFieldChange}
              />
            )}

            {(view === "reset" || view === "resetSent") && (
              <ResetPasswordForm
                status={status}
                fieldErrors={fieldErrors}
                buttonMessage={buttonMessage}
                isSent={resetSent}
                onSubmit={handleReset}
                onBackToLogin={() => switchView("login")}
                onFieldChange={handleFieldChange}
              />
            )}

          </div>
        </div>
      </div>

      {/* Button nudge animation keyframe */}
      <style jsx global>{`
        @keyframes button-nudge {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </>
  );
}
