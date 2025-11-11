import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@hintboard/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get regular client for current user
    const supabase = await createClient();

    // Get current user (if any)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Use admin client to check if email exists
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      console.error("Error checking email:", error);
      return NextResponse.json(
        { error: "Failed to check email availability" },
        { status: 500 },
      );
    }

    // Check if any user (other than current user) has this email
    const normalizedEmail = email.trim().toLowerCase();
    const emailExists = data.users.some(
      (user) =>
        user.email?.toLowerCase() === normalizedEmail &&
        user.id !== currentUser?.id &&
        !user.is_anonymous, // Don't count other anonymous users
    );

    return NextResponse.json({ exists: emailExists });
  } catch (error) {
    console.error("Error in check-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
