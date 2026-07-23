"use client";

import Image from "next/image";

interface SocialAuthButtonsProps {
  onLark: () => void;
  disabled?: boolean;
}

export function SocialAuthButtons({ onLark, disabled }: SocialAuthButtonsProps) {
  return (
    <div className="grid gap-[10px] md:gap-[14px]">
      {/* Divider */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[10px] text-[#2B2339]/[0.36] text-[10px] md:text-xs font-bold">
        <span className="h-px bg-[#2B2339]/[0.12]" aria-hidden="true" />
        <span>or</span>
        <span className="h-px bg-[#2B2339]/[0.12]" aria-hidden="true" />
      </div>

      {/* Lark sign-in button */}
      <button
        type="button"
        onClick={onLark}
        disabled={disabled}
        className="w-full h-9 md:h-12 rounded-full border-2 border-[#8F6AE0]/[0.42] bg-white/[0.18] inline-flex items-center justify-center gap-2 transition-all hover:border-[#8F6AE0]/[0.68] hover:bg-white/[0.3] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F6AE0]/50 disabled:opacity-50 disabled:pointer-events-none"
      >
        <Image src="/lark-icon.webp" alt="" width={20} height={20} className="md:w-6 md:h-6" />
        <span className="text-xs md:text-sm font-semibold text-[#2B2339]/80">Continue with Lark</span>
      </button>
    </div>
  );
}
