import { Metadata } from "next";
import { Suspense } from "react";

import { Spinner } from "@hintboard/ui/component";
import { LoginForm } from "@/domains/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "User Login Page",
};

export default async function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Spinner />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
