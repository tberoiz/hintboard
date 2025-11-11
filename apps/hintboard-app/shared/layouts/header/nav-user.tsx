"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/shared/contexts/organizations-context";

import { UserService } from "@hintboard/supabase/services";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  DropdownMenuLabel,
} from "@hintboard/ui/component";

import {
  LogOut,
  User,
  MessageSquare,
  BookOpen,
  Eye,
  Building2,
} from "lucide-react";

import { toast } from "sonner";

// Helper to create initials like "JD"
function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser() {
  const router = useRouter();
  const { organization: contextOrganization } = useOrganization();

  const { data: user, isLoading } = useQuery({
    queryKey: ["userInfo"],
    queryFn: async () => {
      const userInfo = await UserService.getUserInfo("client");

      if (!userInfo) {
        return null;
      }

      return {
        name: userInfo.fullName || userInfo.email || "",
        email: userInfo.email || "",
        avatarUrl: userInfo.avatarUrl || "",
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const userRole = contextOrganization?.role || "guest";
  const isAdmin = userRole === "admin" || userRole === "moderator";

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

  const handleViewAsCustomer = () => {
    // Add viewAsCustomer parameter and navigate to ideas page
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("viewAsCustomer", "true");
    currentUrl.pathname = "/ideas";

    router.push(currentUrl.pathname + currentUrl.search);
    router.refresh();
  };

  // Don't render if still loading or no user
  if (isLoading || !user) {
    return (
      <Button
        variant="ghost"
        className="h-8 w-8 p-0 rounded-full"
        disabled
        aria-label="Loading user menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">...</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 rounded-full hover:bg-accent focus:outline-none"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.avatarUrl || undefined}
              alt={user.name || "User avatar"}
              className="object-cover"
            />
            <AvatarFallback className="text-xs">
              {getInitials(user.name || user.email || "U")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="text-sm min-w-0 w-full">
              {user.name && (
                <p className="font-light tracking-[-0.01em] truncate">
                  {user.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Settings Link */}
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        {/* My Content */}
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=content" className="cursor-pointer">
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>My content</span>
          </Link>
        </DropdownMenuItem>

        {/* Admin Only: View as customer */}
        {/*{isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/help" className="cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Help docs</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}*/}

        <DropdownMenuSeparator />

        {/* Admin Only: View as customer */}
        {isAdmin && (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleViewAsCustomer}
            >
              <Eye className="mr-2 h-4 w-4" />
              <span>View as customer</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Switch companies */}
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/organizations" className="cursor-pointer">
                <Building2 className="mr-2 h-4 w-4" />
                <span>Switch companies</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}
        {/* Log out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
