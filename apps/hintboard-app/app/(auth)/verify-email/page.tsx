"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@hintboard/ui/component";
import { HintboardIcon } from "@/shared/icons/icons";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-md text-center">
        <HintboardIcon className="w-12 h-12" />

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We've sent a verification link to
          </p>
          {email && <p className="text-sm font-medium">{email}</p>}
        </div>

        <div className="flex flex-col gap-4 w-full text-sm text-muted-foreground">
          <p>
            Click the link in the email to verify your account and complete your
            signup.
          </p>
          <p>
            Didn't receive the email? Check your spam folder or request a new
            verification email.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:support@hintboard.app"
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
