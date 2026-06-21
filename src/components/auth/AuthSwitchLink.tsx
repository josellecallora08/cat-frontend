"use client";

interface AuthSwitchLinkProps {
  text: string;
  linkText: string;
  onClick: () => void;
}

export function AuthSwitchLink({ text, linkText, onClick }: AuthSwitchLinkProps) {
  return (
    <p className="text-[11px] md:text-[13px] font-semibold text-[#2B2339]/[0.44] text-center">
      {text}{" "}
      <button
        type="button"
        onClick={onClick}
        className="border-0 p-0 bg-transparent text-[#2B2339]/[0.72] font-bold cursor-pointer hover:text-[#2B2339] transition-colors"
      >
        {linkText}
      </button>
    </p>
  );
}
