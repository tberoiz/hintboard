// app/api/auth/verify-otp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@hintboard/supabase/server";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log("=== OTP VERIFICATION API START ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request URL:", req.url);
  console.log("Request Headers:", {
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    userAgent: req.headers.get("user-agent"),
    host: req.headers.get("host"),
  });

  try {
    // Parse request body
    const body = await req.json();
    const { email, token } = body;

    console.log("Request Body:", {
      email,
      token: token ? `${token.substring(0, 2)}****` : "missing",
      tokenLength: token?.length,
    });

    // Validate inputs
    if (!email || !token) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 },
      );
    }

    if (token.length !== 6) {
      console.error("❌ Invalid token length:", token.length);
      return NextResponse.json(
        { error: "Token must be 6 characters" },
        { status: 400 },
      );
    }

    // Create Supabase client
    console.log("Creating Supabase client...");
    const supabase = await createClient();

    // Verify OTP
    console.log("Calling Supabase verifyOtp...");
    const verifyStartTime = Date.now();

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    const verifyDuration = Date.now() - verifyStartTime;
    console.log(`Supabase verifyOtp completed in ${verifyDuration}ms`);

    if (error) {
      console.error("❌ Supabase verifyOtp error:", {
        message: error.message,
        status: error.status,
        code: (error as any).code,
        name: error.name,
      });

      // Check for specific error types
      if (
        error.message?.includes("expired") ||
        error.message?.includes("invalid")
      ) {
        return NextResponse.json(
          {
            error:
              "The verification code has expired or is invalid. Please request a new code.",
          },
          { status: 401 },
        );
      }

      if (error.message?.includes("already")) {
        return NextResponse.json(
          {
            error:
              "This verification code has already been used. Please request a new code.",
          },
          { status: 401 },
        );
      }

      if (
        error.message?.includes("rate") ||
        error.message?.includes("too many") ||
        error.status === 429
      ) {
        return NextResponse.json(
          { error: "Too many attempts. Please wait 5 minutes and try again." },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: error.message || "Verification failed" },
        { status: error.status || 500 },
      );
    }

    if (!data.user) {
      console.error("❌ No user returned from verification");
      return NextResponse.json(
        { error: "No user returned from verification" },
        { status: 500 },
      );
    }

    console.log("✅ OTP verified successfully");
    console.log("User ID:", data.user.id);
    console.log("User Email:", data.user.email);
    console.log("User Metadata:", data.user.user_metadata);

    // Wait for session to be established
    console.log("Waiting for session to establish...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check user memberships
    console.log("Fetching user memberships...");
    const { data: memberships, error: membershipError } = await supabase
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
      .eq("user_id", data.user.id);

    if (membershipError) {
      console.error("⚠️ Error fetching memberships:", membershipError);
    } else {
      console.log("Memberships found:", memberships?.length || 0);
      if (memberships && memberships.length > 0) {
        console.log("First organization:", memberships[0]?.organizations);
      }
    }

    // Determine redirect URL
    const referer = req.headers.get("referer") || "";
    const refererUrl = referer ? new URL(referer) : null;
    const refererHost = refererUrl?.host || "";
    const refererParts = refererHost.split(".");

    console.log("Referer analysis:", {
      referer,
      refererHost,
      refererParts,
    });

    let currentSubdomain: string | null = null;

    // Check for subdomain in referer (but ignore 'www')
    if (
      refererParts.length === 2 &&
      refererParts[1] === "localhost" &&
      refererParts[0] &&
      refererParts[0] !== "www"
    ) {
      currentSubdomain = refererParts[0];
    } else if (
      refererParts.length >= 3 &&
      refererParts[0] &&
      refererParts[0] !== "www"
    ) {
      currentSubdomain = refererParts[0];
    }

    console.log("Detected subdomain:", currentSubdomain || "none");

    const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "hintboard.app";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    let redirectTo = "/setup-account";

    if (currentSubdomain) {
      redirectTo = `${protocol}://${currentSubdomain}.${baseDomain}/ideas`;
      console.log("Redirecting to subdomain:", redirectTo);
    } else if (memberships && memberships.length > 0) {
      const firstOrg = memberships[0]?.organizations as any;
      const orgSubdomain = firstOrg?.slug || firstOrg?.id;
      if (orgSubdomain) {
        redirectTo = `${protocol}://${orgSubdomain}.${baseDomain}/ideas`;
        console.log("Redirecting to user's organization:", redirectTo);
      }
    } else {
      console.log("Redirecting to setup account:", redirectTo);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Total verification completed in ${totalDuration}ms`);
    console.log("=== OTP VERIFICATION API END ===\n");

    return NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error("❌ Unexpected error in OTP verification:");
    console.error("Error:", error);
    console.error(
      "Error type:",
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("Error stack:", error instanceof Error ? error.stack : "N/A");
    console.error(`Failed after ${totalDuration}ms`);
    console.log("=== OTP VERIFICATION API END (ERROR) ===\n");

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 },
    );
  }
}
