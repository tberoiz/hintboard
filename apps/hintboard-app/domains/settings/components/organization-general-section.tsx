"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  VStack,
  HStack,
} from "@hintboard/ui/component";
import { Save, Loader2, Sun, Moon, Palette } from "lucide-react";
import { OrganizationService } from "@hintboard/supabase/services";
import { toast } from "sonner";
import { cn } from "@hintboard/ui/utils";

interface OrganizationGeneralSectionProps {
  organizationId: string;
}

type Theme = "light" | "dark" | "solarized";

const THEMES: {
  value: Theme;
  label: string;
  icon: typeof Sun;
  description: string;
}[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Clean and bright theme",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Easy on the eyes",
  },
  {
    value: "solarized",
    label: "Solarized",
    icon: Palette,
    description: "Warm color palette",
  },
];

export function OrganizationGeneralSection({
  organizationId,
}: OrganizationGeneralSectionProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme>("light");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch organization details
  const { data: organization, isLoading } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () =>
      OrganizationService.getOrganization(organizationId, "client"),
    enabled: !!organizationId,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSelectedTheme((organization.theme as Theme) || "light");
    }
  }, [organization]);

  // Update organization mutation
  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; theme?: Theme }) =>
      OrganizationService.updateOrganization(organizationId, data, "client"),
    onSuccess: () => {
      toast.success("Organization updated successfully!");
      setHasChanges(false);
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update organization",
      );
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    setHasChanges(
      value !== organization?.name || selectedTheme !== organization?.theme,
    );
  };

  const handleThemeChange = (theme: Theme) => {
    setSelectedTheme(theme);
    setHasChanges(name !== organization?.name || theme !== organization?.theme);
  };

  const handleSave = () => {
    const updates: { name?: string; theme?: Theme } = {};

    if (name !== organization?.name) {
      updates.name = name;
    }
    if (selectedTheme !== organization?.theme) {
      updates.theme = selectedTheme;
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    }
  };

  const handleReset = () => {
    if (organization) {
      setName(organization.name);
      setSelectedTheme((organization.theme as Theme) || "light");
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!organization) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Manage your organization's name and appearance
        </CardDescription>
      </CardHeader>

      <CardContent>
        <VStack gap={6}>
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Organization"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              The name of your organization as it appears to members
            </p>
          </div>

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.value;

                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => handleThemeChange(theme.value)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all",
                      "hover:border-primary/50 hover:bg-accent/50",
                      isSelected
                        ? "border-primary bg-accent shadow-md"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{theme.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {theme.description}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a theme for your workspace. This will affect the appearance
              for all members.
            </p>
          </div>

          {/* Action Buttons */}
          {hasChanges && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || !name.trim()}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          )}
        </VStack>
      </CardContent>
    </Card>
  );
}
