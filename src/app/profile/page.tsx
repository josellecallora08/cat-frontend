"use client";

import { KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";

import { AvatarUpload } from "@/components/avatar-upload";
import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useChangePassword, useProfile, useUpdateProfile } from "@/hooks/use-profile";

// --- Form Field Component ---

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
  autoComplete?: string;
}

function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly = false,
  error,
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
          readOnly
            ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
            : "border-border bg-background"
        } ${error ? "border-destructive" : ""}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// --- Profile Info Section ---

function ProfileInfoSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  function validateProfileForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.length > 255) {
      newErrors.fullName = "Full name must be 255 characters or fewer";
    }

    if (department && department.length > 255) {
      newErrors.department = "Department must be 255 characters or fewer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");

    if (!validateProfileForm()) return;

    try {
      await updateProfile.mutateAsync({
        full_name: fullName,
        department: department || undefined,
      });
      setSuccessMessage("Profile updated successfully");
      setErrors({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setErrors({ form: message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium leading-tight text-foreground">
          Profile Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your personal details
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <FormField
            id="profile-email"
            label="Email"
            value={profile?.email ?? ""}
            readOnly
          />

          <FormField
            id="profile-full-name"
            label="Full Name"
            value={fullName}
            onChange={(v) => {
              setFullName(v);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.fullName;
                return next;
              });
            }}
            placeholder="Your full name"
            error={errors.fullName}
            autoComplete="name"
          />

          <FormField
            id="profile-department"
            label="Department"
            value={department}
            onChange={(v) => {
              setDepartment(v);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.department;
                return next;
              });
            }}
            placeholder="e.g. Collections, Training"
            error={errors.department}
            autoComplete="organization"
          />

          {errors.form && (
            <p className="text-sm text-destructive" role="alert">
              {errors.form}
            </p>
          )}

          {successMessage && (
            <p className="text-sm text-green-600" aria-live="polite">
              {successMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={updateProfile.isPending}
            size="lg"
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Password Change Section ---

function PasswordChangeSection() {
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  function validatePasswordForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");

    if (!validatePasswordForm()) return;

    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccessMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      setErrors({ form: message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium leading-tight text-foreground">
          Change Password
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your account password
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <FormField
            id="password-current"
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(v) => {
              setCurrentPassword(v);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.currentPassword;
                return next;
              });
            }}
            placeholder="Enter current password"
            error={errors.currentPassword}
            autoComplete="current-password"
          />

          <FormField
            id="password-new"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.newPassword;
                return next;
              });
            }}
            placeholder="At least 8 characters"
            error={errors.newPassword}
            autoComplete="new-password"
          />

          <FormField
            id="password-confirm"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.confirmPassword;
                return next;
              });
            }}
            placeholder="Re-enter new password"
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          {errors.form && (
            <p className="text-sm text-destructive" role="alert">
              {errors.form}
            </p>
          )}

          {successMessage && (
            <p className="text-sm text-green-600" aria-live="polite">
              {successMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={changePassword.isPending}
            size="lg"
          >
            {changePassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {changePassword.isPending ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Page ---

export default function ProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useProfile();

  if (isLoading) {
    return (
      <PageContent>
        <PageSkeleton variant="detail" />
      </PageContent>
    );
  }

  if (isError) {
    return (
      <PageContent>
        <PageError
          title="Failed to load profile"
          message="We couldn't load your profile information."
          onRetry={refetch}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageHeader
        title="Profile"
        subtitle="Manage your account information and password"
      />

      <div className="flex justify-center">
        <AvatarUpload
          fullName={profile?.full_name ?? ""}
          currentAvatarUrl={profile?.avatar_url ?? null}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ProfileInfoSection />
        <PasswordChangeSection />
      </div>
    </PageContent>
  );
}
