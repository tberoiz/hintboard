"use client";

// CORE
import * as React from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

// UI COMPONENTS
import { cn } from "@hintboard/ui/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Separator,
} from "@hintboard/ui/component";

import {
  Home,
  Settings,
  ExternalLink,
  ArrowRightLeft,
  Zap,
  Package,
  BookOpen,
  ScrollText,
  Siren,
  ClockFading,
  Plus,
  ChartSpline,
  Command,
} from "lucide-react";

// SHARED COMPONENTS
import { HintboardIcon } from "@/shared/icons/icons";

// TYPES
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

// NAV ITEMS
const navItems: NavItem[] = [
  { title: "Analytics", url: "/home", icon: ChartSpline },
];

// FEATURE ITEMS
const featureItems: NavItem[] = [];

// SETTINGS ITEMS
const settingsItems: NavItem[] = [
  { title: "Integrations", url: "/integrations", icon: Zap, disabled: true },
  // { title: "Library", url: "/library", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

// NAV ITEM COMPONENT
const NavItem = ({
  item,
  isCollapsed = false,
}: {
  item: NavItem;
  isCollapsed?: boolean;
}) => {
  const segment = useSelectedLayoutSegment();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = segment === item.url.slice(1);
  const button = (
    <SidebarMenuButton
      onClick={() => isMobile && setOpenMobile(false)}
      isActive={isActive}
      className={cn(
        "flex items-center justify-start gap-3 py-2.5 rounded-md transition-all duration-200 h-10 w-full font-light tracking-[-0.01em] text-sm",
        isActive && "!text-sidebar-primary bg-sidebar-accent font-medium",
        item.disabled &&
          "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-inherit",
        isCollapsed ? "justify-center px-0 w-14" : "px-3",
      )}
      disabled={item.disabled}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 min-w-0 text-sm font-light tracking-[-0.01em]">
            {item.title}
          </span>
        </>
      )}
      {item.title === "View Page" && !isCollapsed && (
        <ExternalLink className="h-4 w-4 text-sidebar-foreground opacity-60" />
      )}
    </SidebarMenuButton>
  );

  // Always wrap in TooltipProvider/Tooltip
  return (
    <SidebarMenuItem
      className={isCollapsed ? "w-14 px-0 flex justify-center" : "w-full px-3"}
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={isCollapsed ? "w-14 flex justify-center" : "w-full"}
            >
              {item.disabled ? (
                button
              ) : (
                <Link
                  href={item.url}
                  prefetch={true}
                  {...(item.title === "View Page"
                    ? {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      }
                    : {})}
                >
                  {button}
                </Link>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-popover border shadow-md px-3 py-1.5"
            sideOffset={5}
          >
            <p className="text-xs font-light tracking-[-0.01em]">
              {item.disabled ? "Coming Soon" : item.title}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </SidebarMenuItem>
  );
};

// NAV GROUP COMPONENT
const NavGroup = ({
  items,
  label,
  contentClassName,
  isCollapsed = false,
}: {
  items: NavItem[];
  label?: string;
  contentClassName?: string;
  isCollapsed?: boolean;
}) => (
  <SidebarGroup>
    <SidebarGroupContent className={contentClassName}>
      {label && (
        <SidebarGroupLabel className="text-xs font-light text-muted-foreground px-3 mb-3 uppercase tracking-wider">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className={`space-y-1${isCollapsed ? " items-center" : ""}`}>
        {items.map((item) => (
          <NavItem key={item.title} item={item} isCollapsed={isCollapsed} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

// APP SIDEBAR COMPONENT
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = !isMobile && state === "collapsed";
  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r border-border bg-sidebar"
      {...props}
    >
      <SidebarHeader
        className={cn(
          "flex items-start justify-start px-3",
          isCollapsed && "py-4 mb-1",
        )}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className={cn(
                isCollapsed &&
                  "w-14 h-14 p-0 flex items-center justify-center rounded-lg border border-sidebar-border  hover:bg-sidebar-accent/60 transition-colors shadow-sm",
              )}
            >
              <Link href="/home">
                <Command />
                Acme
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent
        className={`flex flex-col h-full px-0${isCollapsed ? " items-center" : ""}`}
      >
        <NavGroup items={navItems} isCollapsed={isCollapsed} />
        {isCollapsed && <Separator className="w-8 my-4" />}
        <NavGroup
          items={featureItems}
          label="Logistics"
          contentClassName="pt-8"
          isCollapsed={isCollapsed}
        />
        {isCollapsed && <Separator className="w-8 my-4" />}

        <NavGroup
          items={settingsItems}
          label="Settings"
          contentClassName="pt-8"
          isCollapsed={isCollapsed}
        />
      </SidebarContent>

      <SidebarFooter className="px-0"></SidebarFooter>
    </Sidebar>
  );
}
