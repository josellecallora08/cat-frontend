"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { deriveInitials, deriveAltText } from "@/lib/avatar-utils";

/**
 * Props for the AvatarDisplay component.
 */
interface AvatarDisplayProps {
  /** The user's full name, used to derive initials and alt text. */
  fullName: string;
  /** URL to the user's profile photo, or null for initials fallback. */
  avatarUrl: string | null;
  /** Size in pixels for both width and height. */
  size: number;
  /** Optional additional CSS classes. */
  className?: string;
}

/**
 * Displays a user's avatar as either a circular profile photo or
 * an initials fallback with a purple background.
 *
 * Used at 96px on the profile page and 30px in the navigation header.
 */
export function AvatarDisplay({
  fullName,
  avatarUrl,
  size,
  className,
}: AvatarDisplayProps) {
  const initials = deriveInitials(fullName);
  const altText = deriveAltText(fullName, avatarUrl);

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={altText}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={altText}
      className={cn(
        "flex items-center justify-center rounded-full bg-[#8F6AE0] text-white font-bold",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span aria-hidden="true" style={{ fontSize: size * 0.4 }}>
        {initials}
      </span>
    </div>
  );
}
