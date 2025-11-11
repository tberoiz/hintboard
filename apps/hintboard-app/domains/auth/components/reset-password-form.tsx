"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@hintboard/ui/utils";
import { Button, Input, Label } from "@hintboard/ui/component";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { UserService } from "@hintboard/supabase/services";
import { Spinner } from "@hintboard/ui/component";
import { HintboardIcon } from "@/shared/icons/icons";
import { useOrganization } from "@/shared/contexts/organizations-context";
import Image from "next/image";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@hintboard/supabase/client";

interface ResetPasswordFormProps {
  className?: string;
}

export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  // Check if we have a valid token on mount
  useEffect(() => {
    const checkToken = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const errorCode = searchParams.get("error_code");

      console.log("   Error params:", { error, errorCode, errorDescription });

      // If there's an error in the URL, show it
      if (error) {
        console.error("❌ Error in URL:", errorDescription);

        // Check if it's an expired token error
        if (
          errorCode === "otp_expired" ||
          errorDescription?.includes("expired")
        ) {
          toast.error("Reset link has expired. Please request a new one.");
        } else {
          toast.error(errorDescription || "Invalid reset link");
        }

        setTimeout(() => router.push("/forgot-password"), 2000);
        return;
      }

      // Check for hash parameters (Supabase uses hash for tokens)
      const hash = window.location.hash;

      if (hash) {
        // Parse hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const hashError = hashParams.get("error");
        const hashErrorDescription = hashParams.get("error_description");

        if (hashError) {
          console.error("❌ Error in hash:", hashErrorDescription);
          toast.error(hashErrorDescription || "Invalid reset link");
          setTimeout(() => router.push("/forgot-password"), 2000);
          return;
        }

        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (type === "recovery" && accessToken) {
          console.log("✅ Valid recovery token in hash");
          setIsValidToken(true);
          return;
        }
      }

      // Check if we have a valid session (token already exchanged)
      try {
        const supabase = createClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (session) {
          console.log("✅ Valid session found");
          setIsValidToken(true);
          return;
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }

      // No valid token or session found
      console.error("❌ No valid token or session");
      toast.error("Invalid or expired reset link. Please try again.");
      setTimeout(() => router.push("/forgot-password"), 2000);
    };

    checkToken();
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      await UserService.updatePassword(password, "client");
      setIsSuccess(true);
      toast.success("Password updated successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div
        className={cn(
          "flex flex-col gap-6 w-full max-w-sm mx-auto animate-in fade-in duration-500",
          className,
        )}
      >
        <div className="flex flex-col gap-6 items-center text-center">
          <HeaderSection
            organizationLogo={organization.logo}
            organizationName={organization?.name || "hintboard"}
          />
          <div className="py-8">
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div
        className={cn(
          "flex flex-col gap-6 w-full max-w-sm mx-auto animate-in fade-in duration-500",
          className,
        )}
      >
        <div className="flex flex-col gap-6 items-center text-center">
          <HeaderSection
            organizationLogo={organization.logo}
            organizationName={organization?.name || "hintboard"}
          />

          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Password updated!</h2>
              <p className="text-sm text-muted-foreground">
                Redirecting you to sign in...
              </p>
            </div>
          </div>
        </div>

        <PolicyLinks />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 w-full max-w-sm mx-auto animate-in fade-in duration-500",
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <HeaderSection
          organizationLogo={organization.logo}
          organizationName={organization?.name || "hintboard"}
        />

        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-xl font-semibold">Set new password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm new password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner /> Updating password...
                </div>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </div>

      <PolicyLinks />
    </div>
  );
}

const HeaderSection = ({
  organizationName,
  organizationLogo,
}: {
  organizationName?: string;
  organizationLogo?: string;
}) => (
  <div className="flex flex-col items-center gap-4">
    {organizationLogo ? (
      <Image
        src={organizationLogo}
        alt="logo"
        sizes="(max-width: 768px) 16px, 16px"
        width={40}
        height={40}
      />
    ) : (
      <HintboardIcon className="w-10 h-10" />
    )}
    <div className="flex flex-col items-center gap-1">
      <h1 className="text-2xl font-light tracking-tight">
        {organizationName ? organizationName : "Hintboard"}
      </h1>
    </div>
  </div>
);

const PolicyLinks = () => (
  <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
    By continuing, you agree to our{" "}
    <a href="https://www.hintboard.app/terms">Terms of Service</a> and{" "}
    <a href="https://www.hintboard.app/privacy">Privacy Policy</a>.
  </div>
);
