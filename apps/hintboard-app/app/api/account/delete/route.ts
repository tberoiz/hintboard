import { NextResponse } from "next/server";
import { UserService } from "@hintboard/supabase/services";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // UserService handles the complete account deletion process
    await UserService.deleteAccount(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in delete account route:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
