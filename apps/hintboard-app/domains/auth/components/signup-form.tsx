"use client";

import React, { useState } from "react";
import { cn } from "@hintboard/ui/utils";
import { Button, Input, Label } from "@hintboard/ui/component";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserService } from "@hintboard/supabase/services";
import { Spinner } from "@hintboard/ui/component";
import { HintboardIcon } from "@/shared/icons/icons";
import { useOrganization } from "@/shared/contexts/organizations-context";
import Image from "next/image";
import Link from "next/link";

interface SignupFormProps {
  className?: string;
}

export function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();
  const { organization } = useOrganization();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name.trim()) return;

    // Basic password validation
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      // Get current subdomain to pass to signup
      let currentSubdomain: string | null = null;
      if (typeof window !== "undefined") {
        const host = window.location.host;
        const hostWithoutPort = host.split(":")[0];
        const parts = hostWithoutPort?.split(".") || [];

        if (
          parts.length === 2 &&
          parts[1] === "localhost" &&
          parts[0] &&
          parts[0] !== "www"
        ) {
          currentSubdomain = parts[0];
        } else if (parts.length >= 3 && parts[0] && parts[0] !== "www") {
          currentSubdomain = parts[0];
        }
      }

      const { redirectTo } = await UserService.signUpWithPassword(
        email,
        password,
        name,
        currentSubdomain || undefined, // Pass the subdomain
      );

      // Check if it's a full URL (cross-subdomain) or relative path
      if (
        redirectTo.startsWith("http://") ||
        redirectTo.startsWith("https://")
      ) {
        window.location.href = redirectTo;
      } else {
        router.push(redirectTo);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account",
      );
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 w-full max-w-sm mx-auto animate-in fade-in duration-500",
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <HeaderSection
          organizationName={organization?.name}
          organizationLogo={organization.logo}
        />

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                required
                className="h-10"
              />
            </div>
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
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                minLength={6}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading || !email || !password || !name.trim()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner /> Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </Button>
          </div>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </div>
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
        Welcome to {organizationName ? organizationName : "Hintboard"}
      </h1>
      <p className="text-sm text-muted-foreground text-center">
        Create your account to get started
      </p>
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
