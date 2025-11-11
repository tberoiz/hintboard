"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
  Label,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Alert,
  AlertDescription,
} from "@hintboard/ui/component";
import { User, Upload, Loader2, AlertCircle, Mail } from "lucide-react";
import { UserService } from "@hintboard/supabase/services";
import { toast } from "sonner";

interface ProfileSectionProps {
  userInfo: any;
}

export function ProfileSection({ userInfo }: ProfileSectionProps) {
  const isAnonymous = userInfo?.isAnonymous || false;

  // Handle both camelCase and snake_case from the API
  const originalFullName = userInfo?.fullName || userInfo?.full_name || "";
  const originalAvatarUrl = userInfo?.avatarUrl || userInfo?.avatar_url || "";

  const [fullName, setFullName] = useState(originalFullName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Anonymous account conversion state
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Update state when userInfo changes
  useEffect(() => {
    const newName = userInfo?.fullName || userInfo?.full_name || "";
    setFullName(newName);
  }, [userInfo?.fullName, userInfo?.full_name]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Convert anonymous account mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/convert-anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update account");
      }

      return response.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      toast.success("Verification email sent!");
    },
    onError: (error: any) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update account";
      toast.error(errorMessage);
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      try {
        // Upload avatar first if there's a new file
        if (avatarFile) {
          const avatarUrl = await UserService.uploadAvatar(
            avatarFile,
            "client",
          );
        }

        // Update name if it changed (use trimmed comparison)
        const trimmedName = fullName.trim();
        if (trimmedName && trimmedName !== originalFullName) {
          const result = await UserService.updateProfile(
            { full_name: trimmedName },
            "client",
          );
        }
      } catch (error) {
        console.error("=== Profile update failed ===");
        console.error("Error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["userInfo"] });

      // Clean up
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
    },
    onError: (error: any) => {
      console.error("Mutation error callback:", error);
      toast.error(error?.message || "Failed to update profile");
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type:", file.type);
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error("File too large:", file.size);
      toast.error("Image must be smaller than 5MB");
      return;
    }

    // Clean up old preview
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    console.log("Avatar preview created");
  };

  const handleAnonymousConversion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    convertMutation.mutate();
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      console.error("Name is empty");
      toast.error("Please enter your name");
      return;
    }

    updateProfileMutation.mutate();
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges =
    avatarFile !== null ||
    (fullName.trim() && fullName.trim() !== originalFullName);

  // Show email sent confirmation for anonymous users
  if (isAnonymous && emailSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Check Your Email
          </CardTitle>
          <CardDescription>
            We've sent a verification link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Click the link in your email to verify your account and complete
              the conversion. Once verified, you can sign in with your email.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Check your spam folder if you don't see the email</p>
            <p>• The link will expire in 24 hours</p>
            <p>• You can close this page</p>
          </div>

          <Button
            variant="outline"
            onClick={() => setEmailSent(false)}
            className="w-full"
          >
            Try a Different Email
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show anonymous account conversion form
  if (isAnonymous) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create Your Account
            </CardTitle>
            <CardDescription>
              You're currently browsing as a guest. Add your email to save your
              account permanently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnonymousConversion} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  disabled={convertMutation.isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={convertMutation.isPending}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send you a verification link
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  !fullName.trim() || !email.trim() || convertMutation.isPending
                }
              >
                {convertMutation.isPending ? "Sending..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">All your data will be preserved</p>
            <p className="text-sm">
              Your votes, comments, and activity will remain linked to your new
              account.
            </p>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // Show regular profile form for authenticated users
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information and profile picture
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={avatarPreview || originalAvatarUrl}
                alt={fullName || "User avatar"}
              />
              <AvatarFallback className="text-2xl">
                {getInitials(fullName || userInfo?.email || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors w-fit">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {avatarFile
                      ? `Selected: ${avatarFile.name}`
                      : "Upload new photo"}
                  </span>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={updateProfileMutation.isPending}
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={updateProfileMutation.isPending}
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={userInfo?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed at this time
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || !hasChanges}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
