/**
 * Avatar utility functions for deriving initials and alt text
 * from user profile data.
 */

/**
 * Derives display initials from a user's full name.
 *
 * - Multi-word names: first character of first word + first character of last word (uppercased)
 * - Single-word names: first character (uppercased)
 * - Empty/whitespace-only: returns "?"
 *
 * @param fullName - The user's full name string
 * @returns Uppercase initials string (1-2 characters) or "?" for empty input
 */
export function deriveInitials(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "?";

  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  const first = words[0].charAt(0);
  const last = words[words.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

/**
 * Derives accessible alt text for an avatar element.
 *
 * - When an avatar URL is present: "Profile photo of {name}"
 * - When no avatar URL (initials fallback): "Initials {initials}"
 *
 * @param fullName - The user's full name string
 * @param avatarUrl - The URL of the user's avatar image, or null if none
 * @returns Descriptive alt text string for accessibility
 */
export function deriveAltText(
  fullName: string,
  avatarUrl: string | null
): string {
  if (avatarUrl) {
    return `Profile photo of ${fullName}`;
  }
  return `Initials ${deriveInitials(fullName)}`;
}
