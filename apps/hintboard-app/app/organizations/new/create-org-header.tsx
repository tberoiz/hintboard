"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "@hintboard/supabase/services";
import { Button } from "@hintboard/ui/component";
import { LogOut } from "lucide-react";
import { HintboardIcon } from "@/shared/icons/icons";
import { toast } from "sonner";

export function CreateOrgHeader() {
  const router = useRouter();

  const { data: userInfo } = useQuery({
    queryKey: ["userInfo"],
    queryFn: () => UserService.getUserInfo("client"),
  });

  const handleSignOut = async () => {
    try {
      await UserService.signOut("client");
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sign out";
      toast.error(msg);
    }
  };

  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="https://hitboard.app/"
          className="text-2xl font-bold text-primary"
        >
          <HintboardIcon />
        </Link>

        <div className="flex items-center gap-4">
          {userInfo?.email && (
            <span className="text-sm text-muted-foreground">
              {userInfo.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
