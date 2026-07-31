"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

import { AvatarDisplay } from "@/components/avatar-display";
import { useUploadAvatar } from "@/hooks/use-avatar-upload";

/** Maximum allowed file size in bytes (5MB). */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** MIME types accepted for avatar upload. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Props for the AvatarUpload component.
 */
interface AvatarUploadProps {
  /** The user's full name, used for initials fallback and alt text. */
  fullName: string;
  /** URL to the current avatar photo, or null if none exists. */
  currentAvatarUrl: string | null;
}

/**
 * Avatar upload component that wraps `AvatarDisplay` in a clickable button.
 *
 * Provides file selection via hidden input, validates type and size,
 * shows an instant preview via object URL, and uploads with a loading overlay.
 * Displays a camera icon on hover and appropriate toast messages for
 * success, validation errors, and upload failures.
 */
export function AvatarUpload({
  fullName,
  currentAvatarUrl,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const uploadMutation = useUploadAvatar();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset the input value so re-selecting the same file triggers onChange
      e.target.value = "";

      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Please select a JPEG, PNG, or WebP image.");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File must be smaller than 5MB.");
        return;
      }

      // Show instant preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload the file
      uploadMutation.mutate(file, {
        onSuccess: () => {
          toast.success("Photo uploaded successfully.");
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(null);
        },
        onError: () => {
          toast.error("Upload failed. Please try again.");
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(null);
        },
      });
    },
    [uploadMutation]
  );

  const displayUrl = previewUrl ?? currentAvatarUrl;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Upload profile photo"
        className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        disabled={uploadMutation.isPending}
      >
        <AvatarDisplay
          fullName={fullName}
          avatarUrl={displayUrl}
          size={96}
        />
        {uploadMutation.isPending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/20">
            <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />
    </div>
  );
}
