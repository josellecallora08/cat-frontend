"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useUpdateAdminUser } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/lib/api/admin-users";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

interface FormErrors {
  fullName?: string;
  role?: string;
  userType?: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
];

const USER_TYPE_OPTIONS = [
  { value: "trainer", label: "Trainer" },
  { value: "agent", label: "Agent" },
];

export function UserEditDialog({ open, onOpenChange, user }: UserEditDialogProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [userType, setUserType] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");

  const updateUser = useUpdateAdminUser();

  // Track previous user/open state to reset form without useEffect + setState
  const prevKeyRef = useRef<string | null>(null);
  const currentKey = open && user ? user.id : null;

  if (currentKey !== prevKeyRef.current) {
    prevKeyRef.current = currentKey;
    if (user && open) {
      setFullName(user.full_name);
      setRole(user.role);
      setUserType(user.user_type ?? "");
      setErrors({});
      setSubmitError("");
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      newErrors.fullName = "Full name is required.";
    } else if (trimmedName.length > 255) {
      newErrors.fullName = "Full name must be 255 characters or fewer.";
    }

    if (!role) {
      newErrors.role = "Role is required.";
    }

    if (role === "user" && !userType) {
      newErrors.userType = "User type is required when role is User.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleRoleChange(value: string) {
    setRole(value);
    if (value === "admin") {
      setUserType("");
    }
    // Clear related errors on change
    setErrors((prev) => ({ ...prev, role: undefined, userType: undefined }));
  }

  function handleSubmit() {
    if (!validate() || !user) return;

    setSubmitError("");
    updateUser.mutate(
      {
        userId: user.id,
        data: {
          full_name: fullName.trim(),
          role,
          user_type: role === "user" ? userType : null,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (error: Error) => {
          setSubmitError(error.message || "Failed to update user.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[301] max-w-lg" backdropClassName="z-[300]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user account details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              aria-label="Email (read-only)"
              className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter full name"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Role <span className="text-destructive">*</span>
            </label>
            <div className="mt-1">
              <Select
                value={role}
                onChange={handleRoleChange}
                options={ROLE_OPTIONS}
                placeholder="Select role"
                ariaLabel="Role"
              />
            </div>
            {errors.role && (
              <p className="mt-1 text-xs text-destructive">{errors.role}</p>
            )}
          </div>

          {/* User Type (conditional) */}
          {role === "user" && (
            <div>
              <label className="text-sm font-medium text-foreground">
                User Type <span className="text-destructive">*</span>
              </label>
              <div className="mt-1">
                <Select
                  value={userType}
                  onChange={(value) => {
                    setUserType(value);
                    setErrors((prev) => ({ ...prev, userType: undefined }));
                  }}
                  options={USER_TYPE_OPTIONS}
                  placeholder="Select user type"
                  ariaLabel="User type"
                />
              </div>
              {errors.userType && (
                <p className="mt-1 text-xs text-destructive">{errors.userType}</p>
              )}
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
          <Button size="sm" onClick={handleSubmit} disabled={updateUser.isPending}>
            {updateUser.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
