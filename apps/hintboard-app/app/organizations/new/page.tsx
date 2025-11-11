import { Metadata } from "next";
import { Suspense } from "react";
import { Spinner, Button } from "@hintboard/ui/component";
import { CreateOrganizationForm } from "./create-organization-form";
import { CreateOrgHeader } from "./create-org-header";

export const metadata: Metadata = {
  title: "Create Organization",
  description: "Create a new organization",
};

export default async function CreateOrganizationPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CreateOrgHeader />

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-md">
          <Suspense fallback={<Spinner />}>
            <CreateOrganizationForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
