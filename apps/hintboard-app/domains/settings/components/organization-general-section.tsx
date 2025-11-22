"use client";

import { useState, useEffect, useRef } from "react";
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
} from "@hintboard/ui/component";
import {
  Save,
  Loader2,
  Sun,
  Moon,
  Palette,
  Upload,
  X,
  Building2,
  Lock,
} from "lucide-react";
import { OrganizationService } from "@hintboard/supabase/services";
import { toast } from "sonner";
import { cn } from "@hintboard/ui/utils";
import { useRouter } from "next/navigation";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme>("light");
  const [hasChanges, setHasChanges] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const router = useRouter();
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
      setLogoPreview(organization.logo_url || null);
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

      window.location.reload();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update organization",
      );
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) =>
      OrganizationService.uploadLogo(organizationId, file, "client"),
    onSuccess: (url) => {
      toast.success("Logo uploaded successfully!");
      setLogoFile(null);
      setLogoPreview(url);
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload logo",
      );
    },
  });

  // Remove logo mutation
  const removeLogoMutation = useMutation({
    mutationFn: () => OrganizationService.removeLogo(organizationId, "client"),
    onSuccess: () => {
      toast.success("Logo removed successfully!");
      setLogoPreview(null);
      setLogoFile(null);
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove logo",
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (3MB)
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo must be smaller than 3MB");
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleLogoRemove = () => {
    removeLogoMutation.mutate();
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
      setLogoFile(null);
      setLogoPreview(organization.logo_url || null);
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
    <VStack gap={6}>
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

            {/* Organization Logo */}
            <div className="space-y-3">
              <Label>Organization Logo</Label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Organization logo"
                        className="h-20 w-20 rounded-lg object-cover border-2 border-border"
                      />
                      {(logoFile || organization?.logo_url) && (
                        <button
                          onClick={handleLogoRemove}
                          disabled={removeLogoMutation.isPending}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center shadow-md transition-colors"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={
                        uploadLogoMutation.isPending ||
                        removeLogoMutation.isPending
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </Button>

                    {logoFile && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleLogoUpload}
                        disabled={uploadLogoMutation.isPending}
                      >
                        {uploadLogoMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Logo
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Upload a square image (PNG, JPG, or SVG). Max size: 3MB
                  </p>
                </div>
              </div>
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
                          <div className="text-xs ">{theme.description}</div>
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
                Choose a theme for your workspace. This will affect the
                appearance for all members.
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

      {/* Custom Domain Section - Coming Soon */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20 pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Custom Domain
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Coming Soon
                </span>
              </CardTitle>
              <CardDescription>
                Connect your own domain to your organization workspace
              </CardDescription>
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="space-y-4 opacity-60">
            <div className="space-y-2">
              <Label htmlFor="custom-domain-preview" className="text-sm">
                Custom Domain
              </Label>
              <Input
                id="custom-domain-preview"
                placeholder="workspace.yourdomain.com"
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Use your own domain instead of {organization.slug}.
                {window.location.host.split(".").slice(1).join(".")}
              </p>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <h4 className="text-sm font-medium mb-2">
                What you'll be able to do:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>
                    Connect your custom domain (e.g., ideas.company.com)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Automatic SSL certificate provisioning</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Enhanced brand consistency across your workspace</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </VStack>
  );
}
