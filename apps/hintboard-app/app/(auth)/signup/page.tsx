import { Metadata } from "next";
import { Suspense } from "react";

import { Spinner } from "@hintboard/ui/component";
import { SignupForm } from "@/domains/auth/components/signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "User Sign Up Page",
};

export default async function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Spinner />}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
