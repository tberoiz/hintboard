import { NextResponse } from "next/server";
import { createClient } from "@hintboard/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Always trust the Host header for multi-tenant redirects
  const host = request.headers.get("host")!;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${host}`;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const code = searchParams.get("code");

  console.log("🔄 Auth callback triggered");
  console.log("   Token hash:", token_hash ? "present" : "missing");
  console.log("   Code:", code ? "present" : "missing");
  console.log("   Type:", type);
  console.log("   Next:", next);
  console.log("   Origin:", origin);
  console.log("   Host:", host);

  // Detect if we're on a subdomain
  const hostWithoutPort = host.split(":")[0];
  const parts = hostWithoutPort?.split(".") || [];
  const isSubdomain =
    (parts.length === 2 && parts[1] === "localhost" && parts[0] !== "www") ||
    (parts.length >= 3 && parts[0] !== "www");
  const currentSubdomain = isSubdomain ? parts[0] : null;

  console.log("   Is subdomain:", isSubdomain);
  console.log("   Subdomain:", currentSubdomain || "none");

  // Handle the redirect to the app
  const redirectTo = new URL(next.startsWith("/") ? `${origin}${next}` : next);

  if (token_hash && type) {
    // This is a magic link or email verification link
    const supabase = await createClient();

    try {
      // Verify the token hash
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });

      if (error) {
        console.error("❌ Failed to verify token:", error);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(error.message)}`,
        );
      }

      console.log("✅ Token verified successfully");

      // For email type (anonymous conversion), stay on current subdomain or redirect to ideas
      if (type === "email") {
        console.log("📧 Email verification (likely anonymous conversion)");

        if (currentSubdomain) {
          // Stay on the subdomain and go to ideas
          console.log(`   Redirecting to subdomain ideas: ${origin}/ideas`);
          return NextResponse.redirect(`${origin}/ideas`);
        } else {
          // On main domain, redirect to ideas or organizations
          console.log("   Redirecting to main domain ideas");
          return NextResponse.redirect(`${origin}/ideas`);
        }
      }

      // For signup type, redirect to ideas or organizations
      if (type === "signup") {
        if (currentSubdomain) {
          // Stay on subdomain
          return NextResponse.redirect(`${origin}/ideas`);
        }
        return NextResponse.redirect(`${origin}/ideas`);
      }

      // For password recovery, redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      return NextResponse.redirect(redirectTo);
    } catch (error) {
      console.error("❌ Unexpected error verifying token:", error);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error",
        )}`,
      );
    }
  }

  if (code) {
    // This is a PKCE flow (OAuth or email with PKCE)
    const supabase = await createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("❌ Failed to exchange code:", error);

        // For password recovery errors, redirect to reset-password
        if (type === "recovery") {
          return NextResponse.redirect(
            `${origin}/reset-password?error=access_denied&error_description=${encodeURIComponent(error.message)}`,
          );
        }

        // For other errors, redirect to login with error
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(error.message)}`,
        );
      }

      console.log("✅ Code exchanged successfully");

      // Get the user to check their memberships
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ Failed to get user after exchange:", userError);
        return NextResponse.redirect(`${origin}/login?error=session_error`);
      }

      console.log("👤 User authenticated:", user.id);

      // For password recovery, redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // If we're on a subdomain, stay on the subdomain
      if (currentSubdomain) {
        console.log(`✅ Subdomain auth - redirecting to ${origin}/ideas`);
        return NextResponse.redirect(`${origin}/ideas`);
      }

      // Main domain - check memberships
      const { data: memberships } = await supabase
        .from("memberships")
        .select(
          `
            role,
            organizations (
              id,
              name,
              slug
            )
          `,
        )
        .eq("user_id", user.id);

      console.log("📋 User memberships:", memberships?.length || 0);

      if (memberships && memberships.length > 0) {
        // Redirect to first organization
        const firstOrg = memberships[0]?.organizations as any;
        const orgSubdomain = firstOrg?.slug || firstOrg?.id;

        if (orgSubdomain) {
          const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
          const protocol =
            process.env.NODE_ENV === "production" ? "https" : "http";
          const redirectUrl = `${protocol}://${orgSubdomain}.${baseDomain}/ideas`;

          console.log(
            "✅ Main domain signup with org - redirecting to:",
            redirectUrl,
          );
          return NextResponse.redirect(redirectUrl);
        }
      }

      // No memberships - redirect to create organization
      console.log(
        "✅ Main domain signup without org - redirecting to /organizations",
      );
      return NextResponse.redirect(`${origin}/organizations`);
    } catch (error) {
      console.error("❌ Unexpected error in callback:", error);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error",
        )}`,
      );
    }
  }

  // No token_hash or code provided
  console.error("❌ No token_hash or code in callback");
  return NextResponse.redirect(`${origin}/login?error=missing_token`);
}
