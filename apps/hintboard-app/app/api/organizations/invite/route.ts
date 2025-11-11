import { createClient } from "@hintboard/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId, email, role } = await request.json();

    if (!organizationId || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has permission to invite (must be owner or admin)
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (
      membershipError ||
      !membership ||
      !["admin", "admin"].includes(membership.role)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to invite users" },
        { status: 403 },
      );
    }

    // Get organization info
    const { data: organization } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", organizationId)
      .single();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Use admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const { data: existingUsers, error: listError } =
      await adminClient.auth.admin.listUsers();

    if (listError) throw listError;

    const userExists = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    let invitedUserId: string;

    if (userExists) {
      // User exists, check if already a member
      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", userExists.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json(
          { error: "This user is already a member of this organization" },
          { status: 400 },
        );
      }

      invitedUserId = userExists.id;
    } else {
      // Create new user account via admin API
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: false, // They'll confirm via magic link
          user_metadata: {
            invited_to_org: organizationId,
          },
        });

      if (createError || !newUser.user) {
        throw new Error(
          `Failed to create user account: ${createError?.message}`,
        );
      }

      invitedUserId = newUser.user.id;
    }

    // Add membership record
    const { error: membershipInsertError } = await supabase
      .from("memberships")
      .insert({
        user_id: invitedUserId,
        organization_id: organizationId,
        role,
      });

    if (membershipInsertError) {
      throw membershipInsertError;
    }

    // Build invitation link to organization's subdomain
    const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const inviteLink = `${protocol}://${organization.slug}.${baseDomain}/ideas`;

    // Send magic link email (NOT invite email - this prevents session logout)
    const { error: magicLinkError } = await adminClient.auth.admin.generateLink(
      {
        type: "magiclink",
        email: normalizedEmail,
        options: {
          redirectTo: inviteLink,
        },
      },
    );

    if (magicLinkError) {
      console.error("Failed to send magic link email:", magicLinkError);
      // Don't fail - membership is created, they can still access once they sign in
    }

    const origin = request.headers.get("origin");
    const response = NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      inviteLink, // Return link in case email fails
    });

    // Add CORS headers
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;
  } catch (error: any) {
    console.error("Error inviting user:", error);
    const origin = request.headers.get("origin");
    const response = NextResponse.json(
      { error: error.message || "Failed to send invitation" },
      { status: 500 },
    );

    // Add CORS headers even for errors
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;
  }
}
