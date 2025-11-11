"use client";

import React, { useState } from "react";
import { cn } from "@hintboard/ui/utils";
import { Button, Input, Label, Separator } from "@hintboard/ui/component";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserService } from "@hintboard/supabase/services";
import { Spinner } from "@hintboard/ui/component";
import { HintboardIcon } from "@/shared/icons/icons";
import { useOrganization } from "@/shared/contexts/organizations-context";
import Image from "next/image";
import Link from "next/link";

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const { organization } = useOrganization();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const { redirectTo } = await UserService.signInWithPassword(
        email,
        password,
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
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
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
          organizationLogo={organization.logo}
          organizationName={organization?.name || "hintboard"}
        />

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 mt-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner /> Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </div>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary hover:underline underline-offset-4"
          >
            Sign up
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
      <h1 className="text-2xl font-light tracking-tight">Welcome back</h1>
      <p className="text-sm text-muted-foreground text-center">
        Sign in to {organizationName ? organizationName : "Hintboard"}
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
