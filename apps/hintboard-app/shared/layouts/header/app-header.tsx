"use client";
import {
  ButtonGroup,
  HStack,
  Separator,
  Button,
} from "@hintboard/ui/component";
import { NavUser } from "./nav-user";
import {
  LayoutDashboard,
  Lightbulb,
  Map,
  Megaphone,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "@hintboard/supabase/services";

const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if viewing as customer
  const viewAsCustomer = searchParams.get("viewAsCustomer") === "true";

  const navItems = [
    { href: "/ideas", label: "Ideas", icon: Lightbulb },
    { href: "/roadmap", label: "Roadmap", icon: Map },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
  ];

  const { organization } = useOrganization();

  // Check if user is authenticated
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        const u = await UserService.getCurrentUser("client");
        return { isAuthenticated: true, user: u };
      } catch {
        return { isAuthenticated: false, user: null };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isAuthenticated = user?.isAuthenticated ?? false;

  // Use organization slug for subdomain parameter
  const subdomainParam = organization?.slug
    ? `?subdomain=${organization.slug}`
    : "";

  const loginUrl = `/login${subdomainParam}`;
  const signupUrl = `/signup${subdomainParam}`;

  // Helper function to add viewAsCustomer param to URLs
  const addViewAsCustomer = (href: string) => {
    if (!viewAsCustomer) return href;
    return `${href}?viewAsCustomer=true`;
  };

  return (
    <header className="shrink-0 flex items-center justify-between px-6 border-b border-border/40 bg-background">
      {/* LEFT SIDE */}
      <div className="flex items-center gap-6">
        <HStack align="center" gap={2}>
          {organization?.logo ? (
            <img
              src={organization.logo}
              alt={`${organization.name} Logo`}
              className="h-6 w-6 rounded-sm object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-sm bg-muted flex items-center justify-center text-xs font-semibold uppercase">
              {organization?.name?.[0] ?? "?"}
            </div>
          )}
          {organization?.name}
        </HStack>
        {/* NAVIGATION - Always visible */}
        <nav className="flex items-center">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <div key={item.href} className="flex items-center">
                <Link
                  href={addViewAsCustomer(item.href)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
                {/* Add separator between items, except the last one */}
                {index < navItems.length - 1 && (
                  <Separator orientation="vertical" className="h-6 mx-1" />
                )}
              </div>
            );
          })}
        </nav>
      </div>
      {/* RIGHT SIDE - Only this changes based on auth status */}
      <ButtonGroup>
        {!userLoading &&
          (isAuthenticated ? (
            <NavUser />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href={loginUrl}>Sign In</Link>
              </Button>
              <Button asChild>
                <Link href={signupUrl}>Sign Up</Link>
              </Button>
            </div>
          ))}
      </ButtonGroup>
    </header>
  );
};

export default AppHeader;
