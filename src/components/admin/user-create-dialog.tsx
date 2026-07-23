"use client";

import { Loader2 } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { useCreateAdminUser } from "@/hooks/use-admin-users";

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  email: string;
  fullName: string;
  password: string;
  role: string;
  userType: string;
}

const INITIAL_FORM: FormState = {
  email: "",
  fullName: "",
  password: "",
  role: "",
  userType: "",
};

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const USER_TYPE_OPTIONS = [
  { value: "agent", label: "Agent" },
  { value: "trainer", label: "Trainer" },
];

export function UserCreateDialog({ open, onOpenChange }: UserCreateDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createUser = useCreateAdminUser();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
      setIsSubmitting(false);
    }
    onOpenChange(nextOpen);
  }

  function handleRoleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      role: value,
      userType: value === "admin" ? "" : prev.userType,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.role;
      if (value === "admin") {
        delete next.userType;
      }
      return next;
    });
  }

  function validate(): Record<string, string> {
    const newErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    } else if (form.fullName.trim().length > 255) {
      newErrors.fullName = "Full name must be 255 characters or fewer.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!form.role) {
      newErrors.role = "Role is required.";
    }

    if (form.role === "user" && !form.userType) {
      newErrors.userType = "User type is required when role is User.";
    }

    return newErrors;
  }

  async function handleSubmit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await createUser.mutateAsync({
        email: form.email.trim(),
        full_name: form.fullName.trim(),
        password: form.password,
        role: form.role,
        user_type: form.role === "user" ? form.userType : null,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred.";
      if (message.toLowerCase().includes("already registered")) {
        setErrors({ email: "This email is already registered." });
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[301] max-w-lg" backdropClassName="z-[300]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new user account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="create-user-email"
              className="text-sm font-medium text-foreground"
            >
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="create-user-email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, email: e.target.value }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.email;
                  return next;
                });
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="create-user-fullname"
              className="text-sm font-medium text-foreground"
            >
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              id="create-user-fullname"
              type="text"
              value={form.fullName}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, fullName: e.target.value }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.fullName;
                  return next;
                });
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="John Doe"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="create-user-password"
              className="text-sm font-medium text-foreground"
            >
              Password <span className="text-destructive">*</span>
            </label>
            <input
              id="create-user-password"
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, password: e.target.value }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.password;
                  return next;
                });
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Minimum 8 characters"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="create-user-role"
              className="text-sm font-medium text-foreground"
            >
              Role <span className="text-destructive">*</span>
            </label>
            <div className="mt-1">
              <Select
                id="create-user-role"
                value={form.role}
                onChange={handleRoleChange}
                options={ROLE_OPTIONS}
                placeholder="Select role"
              />
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          {/* User Type (conditional) */}
          {form.role === "user" && (
            <div>
              <label
                htmlFor="create-user-type"
                className="text-sm font-medium text-foreground"
              >
                User Type <span className="text-destructive">*</span>
              </label>
              <div className="mt-1">
                <Select
                  id="create-user-type"
                  value={form.userType}
                  onChange={(value) => {
                    setForm((prev) => ({ ...prev, userType: value }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.userType;
                      return next;
                    });
                  }}
                  options={USER_TYPE_OPTIONS}
                  placeholder="Select user type"
                />
              </div>
              {errors.userType && (
                <p className="mt-1 text-sm text-destructive">{errors.userType}</p>
              )}
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <p className="text-sm text-destructive">{errors.submit}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating...
              </span>
            ) : (
              "Create User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
