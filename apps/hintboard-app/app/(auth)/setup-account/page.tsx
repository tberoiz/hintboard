import { Metadata } from "next";
import { Suspense } from "react";

import { SetupAccountForm } from "@/domains/auth/components/setup-account-form";
import { Spinner } from "@hintboard/ui/component";

export const metadata: Metadata = {
  title: "Setup Account",
  description: "Setup Account Page",
};

export default async function SetupAccountPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Spinner />}>
          <SetupAccountForm />
        </Suspense>
      </div>
    </div>
  );
}
