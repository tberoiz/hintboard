import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@hintboard/ui/component";
import { formatDistanceToNow } from "date-fns";
import { HStack, VStack } from "@hintboard/ui/component";

interface CreatorUserProps {
  name?: string;
  email: string;
  avatar?: string;
  organization?: string;
  createdAt: string;
  size?: "sm" | "md" | "lg";
  showTime?: boolean;
  className?: string;
}

const SIZES = {
  sm: { avatar: "w-6 h-6", name: "text-sm", org: "text-xs", time: "text-xs" },
  md: { avatar: "w-9 h-9", name: "text-sm", org: "text-xs", time: "text-xs" },
  lg: {
    avatar: "w-10 h-10",
    name: "text-base",
    org: "text-sm",
    time: "text-sm",
  },
};

const getInitials = (name: string | undefined, email: string): string => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
};

const getDisplayName = (name: string | undefined, email: string): string => {
  return (name || email.split("@")[0]) as string;
};

export const CreatorUser = ({
  name,
  email,
  avatar,
  organization,
  createdAt,
  size = "md",
  showTime = true,
  className,
}: CreatorUserProps) => {
  const sizeClasses = SIZES[size];
  const displayName = getDisplayName(name, email);
  const initials = getInitials(name, email);
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <HStack gap={3} align="start" className={className}>
      <Avatar
        className={`${sizeClasses.avatar} ring-2 ring-background shadow-sm`}
      >
        <AvatarImage src={avatar} alt={displayName} />
        <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-primary/10">
          {initials}
        </AvatarFallback>
      </Avatar>
      <VStack gap={0} className="flex-1 min-w-0">
        <HStack gap={2} align="center">
          <span className={`font-semibold text-foreground ${sizeClasses.name}`}>
            {displayName}
          </span>
          {organization && (
            <span className={`text-muted-foreground ${sizeClasses.org}`}>
              @ {organization}
            </span>
          )}
        </HStack>
        {showTime && (
          <span className={`text-muted-foreground ${sizeClasses.time}`}>
            {timeAgo}
          </span>
        )}
      </VStack>
    </HStack>
  );
};

// Alternative compact version for inline use - matches the image design
export const CreatorUserInline = ({
  name,
  email,
  avatar,
  organization,
  createdAt,
  className,
}: CreatorUserProps) => {
  const displayName = getDisplayName(name, email);
  const initials = getInitials(name, email);
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <HStack gap={1.5} align="center" className={className}>
      <span className="text-xs font-medium text-foreground">{displayName}</span>
      {organization && (
        <>
          <span className="text-muted-foreground text-xs">
            {"@"} {organization}
          </span>
        </>
      )}
      <span className="text-muted-foreground text-xs">•</span>
      <span className="text-xs text-muted-foreground">{timeAgo}</span>
    </HStack>
  );
};
