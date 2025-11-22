import { createClient } from "@hintboard/supabase/server";
import {
  OrganizationService,
  ServiceError,
} from "@hintboard/supabase/services";
import { NextRequest, NextResponse } from "next/server";
import { getSubdomain } from "./shared/lib/subdomain";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host");
  const path = url.pathname;

  if (!host) return NextResponse.next();

  const subdomain = getSubdomain(host);
  const supabase = await createClient();

  // Check if viewing as customer
  const viewAsCustomer = url.searchParams.get("viewAsCustomer") === "true";

  // ✅ Get logged-in user (even on main domain)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ CASE 1: No subdomain (main domain)
  if (!subdomain) {
    // ✅ Allow public access to landing page
    if (path === "/") {
      return NextResponse.next();
    }

    // ⛔️ Not logged in → redirect to login (unless already there or on auth pages)
    if (!user) {
      if (
        path !== "/login" &&
        path !== "/signup" &&
        path !== "/signup" &&
        path !== "/forgot-password" &&
        path !== "/reset-password" &&
        path !== "/verify-email" &&
        path !== "/auth/callback"
      ) {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // ✅ Logged in → check if user has organizations
    try {
      const orgs = await OrganizationService.getUserOrganizations(
        user.id,
        "server",
      );

      if (orgs && orgs.length > 0) {
        // Redirect to their first organization (unless already on /organizations pages)
        if (path !== "/organizations" && path !== "/organizations/new") {
          const firstOrg = orgs[0];
          const baseDomain = process.env.NEXT_PUBLIC_APP_URL || host;
          const protocol =
            process.env.NODE_ENV === "production" ? "https" : "http";
          const orgUrl = `${protocol}://${firstOrg.slug}.${baseDomain}/ideas`;
          return NextResponse.redirect(orgUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching user organizations:", error);
    }

    // No organizations found → redirect to /organizations (unless already there)
    if (path !== "/organizations" && path !== "/organizations/new") {
      url.pathname = "/organizations";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // ✅ CASE 2: Subdomain present → normal org logic
  let org;
  try {
    org = await OrganizationService.getOrganizationUsingSlug(
      subdomain,
      "server",
    );
  } catch (error: any) {
    // Handle case where organization doesn't exist
    if (
      error instanceof ServiceError &&
      (error.code === "NOT_FOUND" ||
        error.message?.toLowerCase().includes("not found"))
    ) {
      url.pathname = "/404";
      return NextResponse.rewrite(url);
    }
    // Re-throw other errors
    throw error;
  }

  if (!org) {
    url.pathname = "/404";
    return NextResponse.rewrite(url);
  }

  // ⛔️ ROOT PATH PROTECTION: Redirect to /ideas if on subdomain root
  if (path === "/") {
    url.pathname = "/ideas";
    return NextResponse.redirect(url);
  }

  // ⛔️ SETTINGS PAGE PROTECTION: Redirect to /ideas if not logged in
  if (path.startsWith("/settings") && !user) {
    url.pathname = "/ideas";
    return NextResponse.redirect(url);
  }

  // Check user's role in this organization
  let role = "guest";
  let actualRole = "guest"; // Store the actual role for comparison

  if (user) {
    try {
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", org.id)
        .single();

      if (membership) {
        actualRole = membership.role;
        // If viewing as customer and user is admin, override role to guest
        role = viewAsCustomer && actualRole === "admin" ? "guest" : actualRole;
      }
    } catch (error) {
      console.error("Error fetching membership:", error);
      // Continue as guest if membership fetch fails
    }

    // ⛔️ TRIAL EXPIRATION CHECK: Only check for admins
    if (actualRole === "admin" && path !== "/plan-required") {
      try {
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("status, trial_ends_at")
          .eq("user_id", user.id)
          .single();

        // Check if trial has expired
        if (
          subscription?.status === "trialing" &&
          subscription?.trial_ends_at
        ) {
          const now = new Date();
          const trialEndsAt = new Date(subscription.trial_ends_at);

          if (trialEndsAt <= now) {
            // Trial expired - redirect to plan-required page
            url.pathname = "/plan-required";
            return NextResponse.redirect(url);
          }
        }
      } catch (error) {
        console.error("Error checking trial status:", error);
        // Continue without blocking if check fails
      }
    }
  }

  // Set organization context headers
  const response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  response.headers.set("x-organization-id", org.id);
  response.headers.set("x-organization-name", org.name);
  response.headers.set("x-organization-role", role);
  response.headers.set("x-organization-actual-role", actualRole);
  response.headers.set("x-organization-logo", org.logo_url ?? "");
  response.headers.set("x-organization-slug", org.slug);
  response.headers.set("x-organization-theme", org.theme || "light");
  response.headers.set("x-view-as-customer", viewAsCustomer ? "true" : "false");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|public|api).*)"],
  runtime: "nodejs",
};
