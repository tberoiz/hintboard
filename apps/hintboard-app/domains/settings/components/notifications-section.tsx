"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Label,
  Switch,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@hintboard/ui/component";
import { Bell, Loader2 } from "lucide-react";
import { UserService } from "@hintboard/supabase/services";
import { toast } from "sonner";

export function NotificationsSection() {
  // Mock state for now - you'll replace this with real data later
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,
  });

  // Fetch user's organizations (for future implementation)
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["userInfo"],
    queryFn: () => UserService.getUserInfo("client"),
  });

  // Mock organizations for demonstration
  const mockOrganizations = [
    {
      id: "1",
      name: "Acme Corp",
      slug: "acme",
      logo_url: null,
    },
    {
      id: "2",
      name: "Tech Startup",
      slug: "techstartup",
      logo_url: null,
    },
  ];

  const handleToggle = (key: string) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
    toast.success("Notification preferences updated");
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications across all workspaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates about your activity
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={notifications.emailNotifications}
              onCheckedChange={() => handleToggle("emailNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-base">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified about mentions and replies
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={notifications.pushNotifications}
              onCheckedChange={() => handleToggle("pushNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-digest" className="text-base">
                Weekly Digest
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of activity
              </p>
            </div>
            <Switch
              id="weekly-digest"
              checked={notifications.weeklyDigest}
              onCheckedChange={() => handleToggle("weeklyDigest")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Notifications</CardTitle>
          <CardDescription>
            Enable or disable notifications for each workspace you're a member
            of
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockOrganizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={org.logo_url || undefined}
                      alt={org.name}
                    />
                    <AvatarFallback>{getInitials(org.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">@{org.slug}</p>
                  </div>
                </div>
                <Switch
                  id={`org-${org.id}`}
                  defaultChecked={true}
                  onCheckedChange={() =>
                    toast.success(
                      `Notifications ${Math.random() > 0.5 ? "enabled" : "disabled"} for ${org.name}`,
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">
                  Coming Soon: Advanced Notification Settings
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Soon you'll be able to customize notification types,
                  frequency, and delivery methods for each workspace
                  individually.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
