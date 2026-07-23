"use client";

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
import { useDeleteAdminUser } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/lib/api/admin-users";

interface UserDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

export function UserDeleteDialog({
  open,
  onOpenChange,
  user,
}: UserDeleteDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const deleteUser = useDeleteAdminUser();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmEmail("");
      setErrorMessage("");
    }
    onOpenChange(nextOpen);
  }

  const isConfirmEnabled = confirmEmail === user?.email;

  async function handleConfirm() {
    if (!user || !isConfirmEnabled) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteUser.mutateAsync(user.id);
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete user.";
      setErrorMessage(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[301] max-w-md"
        backdropClassName="z-[300]"
      >
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            This action is irreversible. All user data will be permanently
            removed.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-foreground">
                You are about to permanently delete the account for:
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {user.full_name}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-email-input"
                className="text-sm font-medium text-foreground"
              >
                Type the user&apos;s email to confirm:
              </label>
              <input
                id="confirm-email-input"
                type="text"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user.email}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
