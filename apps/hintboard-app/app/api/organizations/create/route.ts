import { NextRequest, NextResponse } from "next/server";
import { OrganizationService } from "@hintboard/supabase/services";

export async function POST(request: NextRequest) {
  try {
    const { name, slug } = await request.json();

    // Call the service to create workspace
    const workspace = await OrganizationService.createWorkspace({
      name,
      slug,
    });

    return NextResponse.json(workspace);
  } catch (error: any) {
    console.error("Error in create workspace API:", error);

    // Check for specific error messages from the service
    if (error.message?.includes("already taken")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to create workspace" },
      { status: 500 },
    );
  }
}
