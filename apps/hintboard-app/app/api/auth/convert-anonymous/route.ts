// app/api/auth/convert-anonymous/route.ts
import { NextResponse } from "next/server";
import { UserService } from "@hintboard/supabase/services";

export async function POST(request: Request) {
  try {
    const { email, fullName } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 },
      );
    }

    // Extract subdomain from the request
    const host = request.headers.get("host");
    let currentSubdomain: string | null = null;

    if (host) {
      const hostWithoutPort = host.split(":")[0];
      const parts = hostWithoutPort?.split(".") || [];

      // Check for subdomain in local development
      if (
        parts.length === 2 &&
        parts[1] === "localhost" &&
        parts[0] &&
        parts[0] !== "www"
      ) {
        currentSubdomain = parts[0];
      }
      // Check for subdomain in production
      else if (parts.length >= 3 && parts[0] && parts[0] !== "www") {
        currentSubdomain = parts[0];
      }
    }

    console.log("🔄 Converting anonymous account");
    console.log("   Email:", email);
    console.log("   Full Name:", fullName);
    console.log(
      "   Current subdomain:",
      currentSubdomain || "none (main domain)",
    );

    // Call the service method with subdomain
    await UserService.convertAnonymousToRealWithEmail(
      email,
      fullName,
      currentSubdomain || undefined,
    );

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error: any) {
    console.error("Convert anonymous error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert account" },
      { status: 500 },
    );
  }
}
