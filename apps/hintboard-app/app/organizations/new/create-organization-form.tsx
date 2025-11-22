"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@hintboard/ui/component";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hintboard/ui/component";
import { Button } from "@hintboard/ui/component";
import { Input } from "@hintboard/ui/component";
import { toast } from "sonner";
import { OrganizationService } from "@hintboard/supabase/services";
import { useState } from "react";
import { AlertCircle } from "lucide-react";

// Regex for valid subdomains: lowercase letters, numbers, hyphens only, no spaces
const subdomainRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Reserved subdomains that shouldn't be allowed
const RESERVED_SUBDOMAINS = [
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "auth",
  "login",
  "signup",
  "mail",
  "ftp",
  "blog",
  "docs",
  "help",
  "support",
  "dev",
  "staging",
  "prod",
  "test",
  "localhost",
];

// Zod schema
const formSchema = z.object({
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name cannot exceed 50 characters"),
  workspaceSubdomain: z
    .string()
    .min(2, "Subdomain must be at least 2 characters")
    .max(30, "Subdomain cannot exceed 30 characters")
    .regex(
      subdomainRegex,
      "Subdomain can only contain lowercase letters, numbers, and hyphens",
    )
    .refine(
      (val) => !RESERVED_SUBDOMAINS.includes(val.toLowerCase()),
      "This subdomain is reserved. Please choose another one.",
    )
    .transform((val) => val.toLowerCase()),
});

export function CreateOrganizationForm() {
  const router = useRouter();
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [hasUserEditedSlug, setHasUserEditedSlug] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit", // Only validate on submit, not on change
    defaultValues: {
      organizationName: "",
      workspaceSubdomain: "",
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .slice(0, 30); // Limit to 30 characters
  };

  // Auto-generate subdomain from organization name (only if user hasn't manually edited it)
  const handleOrganizationNameChange = (name: string) => {
    if (!hasUserEditedSlug) {
      const slug = generateSlug(name);
      form.setValue("workspaceSubdomain", slug, {
        shouldValidate: false, // Don't trigger validation
        shouldDirty: false, // Don't mark as dirty
        shouldTouch: false, // Don't mark as touched
      });
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Clear any previous subdomain errors
      setSubdomainError(null);

      // Call API route directly to create workspace
      const response = await fetch("/api/organizations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: values.organizationName,
          slug: values.workspaceSubdomain,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create organization");
      }

      const workspace = await response.json();

      toast.success("Organization created successfully!");

      // Redirect to the organization subdomain
      const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "localhost:3000";
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const orgUrl = `${protocol}://${workspace.slug}.${baseDomain}/ideas`;

      // Use window.location for cross-subdomain redirect
      window.location.href = orgUrl;
    } catch (error: any) {
      console.error("Organization creation error:", error);

      // Extract error message from various error formats
      const errorMessage =
        error?.message ||
        error?.error?.message ||
        error?.toString() ||
        "Failed to create organization";

      console.log("Extracted error message:", errorMessage);

      // Check if it's a duplicate name error
      if (
        errorMessage.includes("idx_organizations_name_lower") ||
        (errorMessage.toLowerCase().includes("duplicate") &&
          errorMessage.toLowerCase().includes("name"))
      ) {
        const errorMsg = `An organization with the name "${values.organizationName}" already exists. Please choose a different name.`;
        setSubdomainError(errorMsg);
        form.setError("organizationName", {
          type: "manual",
          message: errorMsg,
        });
        toast.error(errorMsg);
        return;
      }

      // Check for duplicate subdomain/slug errors
      if (
        errorMessage.includes("idx_organizations_slug_lower") ||
        errorMessage.toLowerCase().includes("slug") ||
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("already taken") ||
        (errorMessage.toLowerCase().includes("duplicate") &&
          errorMessage.toLowerCase().includes("unique constraint"))
      ) {
        const errorMsg = `The subdomain "${values.workspaceSubdomain}" is already taken. Please choose a different one.`;
        setSubdomainError(errorMsg);
        form.setError("workspaceSubdomain", {
          type: "manual",
          message: errorMsg,
        });
        toast.error(errorMsg);
        return;
      }

      // Generic error handling
      const displayMessage =
        errorMessage === "Something went wrong. Please try again"
          ? "Failed to create organization. Please check your connection and try again."
          : errorMessage;

      toast.error(displayMessage);
      setSubdomainError(displayMessage);
    }
  };

  return (
    <Card className="w-full animate-in fade-in">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </Button>
        </div>
        <div className="text-center">
          <CardTitle>Create New Organization</CardTitle>
          <CardDescription className="mt-2">
            Set up a new workspace for your team
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error Alert Banner */}
        {subdomainError && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Subdomain Already Taken
              </p>
              <p className="text-sm text-destructive/90 mt-1">
                {subdomainError}
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Organization Name */}
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="My Company"
                      disabled={isSubmitting}
                      onChange={(e) => {
                        field.onChange(e);
                        handleOrganizationNameChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    The name of your organization or workspace
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workspace Subdomain */}
            <FormField
              control={form.control}
              name="workspaceSubdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Subdomain</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="mycompany"
                        disabled={isSubmitting}
                        className={subdomainError ? "border-destructive" : ""}
                        onChange={(e) => {
                          // Mark that user has manually edited the slug
                          setHasUserEditedSlug(true);

                          // Clear error when user starts typing
                          if (subdomainError) {
                            setSubdomainError(null);
                          }

                          // Remove spaces and convert to lowercase
                          const cleanedValue = e.target.value
                            .replace(/\s+/g, "")
                            .toLowerCase();
                          field.onChange(cleanedValue);
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <span className="text-muted-foreground text-sm whitespace-nowrap">
                      .hintboard.app
                    </span>
                  </div>
                  <FormDescription>Your unique workspace URL</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current rounded-full animate-spin border-t-transparent" />
                  <span>Creating organization...</span>
                </div>
              ) : (
                "Create Organization"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
