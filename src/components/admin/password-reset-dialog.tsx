"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useResetAdminUserPassword } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/lib/api/admin-users";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

function generateRandomPassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = uppercase + lowercase + digits + special;

  const array = new Uint32Array(12);
  crypto.getRandomValues(array);

  // Ensure at least one from each category
  const required = [
    uppercase[array[0]! % uppercase.length]!,
    lowercase[array[1]! % lowercase.length]!,
    digits[array[2]! % digits.length]!,
    special[array[3]! % special.length]!,
  ];

  // Fill remaining 8 characters from all characters
  const remaining: string[] = [];
  for (let i = 4; i < 12; i++) {
    remaining.push(all[array[i]! % all.length]!);
  }

  // Combine and shuffle using Fisher-Yates
  const combined = [...required, ...remaining];
  const shuffleArray = new Uint32Array(combined.length);
  crypto.getRandomValues(shuffleArray);
  for (let i = combined.length - 1; i > 0; i--) {
    const j = shuffleArray[i]! % (i + 1);
    [combined[i], combined[j]] = [combined[j]!, combined[i]!];
  }

  return combined.join("");
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  user,
}: PasswordResetDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const resetPassword = useResetAdminUserPassword();

  function resetState() {
    setNewPassword("");
    setIsSubmitting(false);
    setShowSuccess(false);
    setCopied(false);
    setError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  }

  function handleGenerate() {
    const password = generateRandomPassword();
    setNewPassword(password);
    setError("");
  }

  async function handleSubmit() {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    setError("");

    try {
      await resetPassword.mutateAsync({
        userId: user.id,
        data: { new_password: newPassword },
      });
      setShowSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  }

  function handleDone() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[301] max-w-md"
        backdropClassName="z-[300]"
      >
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {user
              ? `Set a new password for ${user.full_name} (${user.email})`
              : "Set a new password for this user"}
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Password has been reset successfully. Share this password with the
              user securely. It will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {newPassword}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy password to clipboard"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p
                className="text-xs text-green-600"
                aria-live="polite"
              >
                Copied!
              </p>
            )}
            <DialogFooter>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="new-password-input"
                className="text-sm font-medium text-foreground"
              >
                New Password
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="new-password-input"
                  type="text"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter or generate a password"
                  aria-describedby={error ? "password-error" : undefined}
                  aria-invalid={error ? true : undefined}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleGenerate}
                  aria-label="Generate random password"
                  type="button"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p
                  id="password-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters required
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || newPassword.length < 8}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
