"use client";

import React, { useState } from "react";
import { cn } from "@hintboard/ui/utils";
import { Button, Input, Label } from "@hintboard/ui/component";
import { toast } from "sonner";
import { UserService } from "@hintboard/supabase/services";
import { Spinner } from "@hintboard/ui/component";
import { HintboardIcon } from "@/shared/icons/icons";
import { useOrganization } from "@/shared/contexts/organizations-context";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const { organization } = useOrganization();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await UserService.sendPasswordResetEmail(email);
      setEmailSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to
              </p>
              <p className="text-sm font-medium">{email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                onClick={() => setEmailSent(false)}
                className="text-primary hover:underline underline-offset-4"
              >
                try again
              </button>
            </p>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
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
          <h2 className="text-xl font-semibold">Forgot your password?</h2>
          <p className="text-sm text-muted-foreground">
            No worries! Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m@example.com"
                autoComplete="email"
                required
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner /> Sending...
                </div>
              ) : (
                "Send reset link"
              )}
            </Button>
          </div>
        </form>

        <Link href="/login" className="w-full">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </Link>
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
