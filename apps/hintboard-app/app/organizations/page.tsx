import { redirect } from "next/navigation";
import { OrganizationService, UserService } from "@hintboard/supabase/services";
import { Card, CardContent } from "@hintboard/ui/component";
import Link from "next/link";
import { NavUser } from "@/shared/layouts/header/nav-user";
import { HintboardIcon } from "@/shared/icons/icons";
import { OrganizationsClient } from "@/domains/organizations/components/organization-client";
import { CreateOrganizationButton } from "@/domains/organizations/components/create-organization-button";

export default async function OrganizationsPage() {
  // Fetch user info server-side
  let userInfo;
  let organizations = [];

  try {
    userInfo = await UserService.getUserInfo("server");
    if (!userInfo?.id) {
      redirect("/");
    }

    // Fetch organizations server-side
    organizations = await OrganizationService.getUserOrganizations(
      userInfo.id,
      "server",
    );
  } catch (error) {
    console.error("Error fetching user or organizations:", error);
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            <HintboardIcon />
          </Link>
          <NavUser />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold mb-2">Choose your company</h1>
          <p className="text-muted-foreground">
            Select a company or create a new one
          </p>
        </div>

        {/* Organizations List */}
        <Card className="mb-6">
          <CardContent className="p-0">
            {organizations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>You don&apos;t have any companies yet.</p>
                <p className="text-sm mt-2">Create your first one below!</p>
              </div>
            ) : (
              <div className="divide-y">
                {organizations.map((org) => (
                  <OrganizationsClient key={org.id} org={org} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create New Company Button - Now with subscription limit check */}
        <div className="text-center">
          <CreateOrganizationButton />
        </div>
      </main>
    </div>
  );
}
