import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@hintboard/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    // Get current user and verify they're anonymous
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No user session found" },
        { status: 401 },
      );
    }

    if (!currentUser.is_anonymous) {
      return NextResponse.json(
        { error: "User is not anonymous" },
        { status: 400 },
      );
    }

    // Send OTP to the email for verification
    // This does NOT create a new user, just sends a verification code
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false, // Important: don't create a new user
      },
    });

    if (error) {
      console.error("Error sending OTP:", error);
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in send-conversion-otp API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
