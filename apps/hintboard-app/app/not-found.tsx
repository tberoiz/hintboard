import Link from "next/link";
import { Card, Button } from "@hintboard/ui/component";
import { AlertCircle } from "lucide-react";
import { headers } from "next/headers";

export default async function NotFound() {
  // Get the current host from headers
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // Get the main app URL from environment variable
  const mainAppUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Check if we're on a subdomain by comparing with main app URL
  const isSubdomain = host !== mainAppUrl.replace(/^https?:\/\//, "");

  // If on subdomain, redirect to main domain login, otherwise use relative path
  const loginUrl = isSubdomain ? `${mainAppUrl}/login` : "/login";

  return (
    <div className="h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Page Not Found
        </h2>
        <p className="text-muted-foreground">
          We couldn&apos;t find the page you&apos;re looking for. Please check
          the URL or go back home.
        </p>
        <Button asChild className="mt-4">
          {isSubdomain ? (
            <a href={loginUrl}>Back to login</a>
          ) : (
            <Link href={loginUrl}>Back to login</Link>
          )}
        </Button>
      </Card>
    </div>
  );
}
