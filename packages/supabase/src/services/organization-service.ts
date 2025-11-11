import { Database } from "src/lib/types";
import { ServiceBase } from "./base-service";
import type { User } from "@supabase/supabase-js";

export type OrganizationData =
  Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationWithRole = OrganizationData & {
  role: string;
};
export type OrganizationRole = "admin" | "moderator" | "viewer" | "guest";
/**
 * Workspace Service - Handles all workspace/organization operations
 * Methods read like natural conversations
 */
export class OrganizationService extends ServiceBase {
  // ==========================================
  // Workspace - Creation and management
  // ==========================================

  /**
   * Create a new workspace and assign the creator as owner
   * Server-side only - called from API routes
   */
  static async createWorkspace(data: {
    name: string;
    slug: string;
  }): Promise<{ id: string; name: string; slug: string }> {
    const userId = await this.getCurrentUserId();

    return this.execute(
      async () => {
        const adminClient = this.getAdminClient();

        // 1. Create the organization
        const { data: workspace, error: orgError } = await adminClient
          .from("organizations")
          .insert({
            name: data.name,
            slug: data.slug,
            owner_id: userId,
          })
          .select()
          .single();

        if (orgError) {
          // Check for unique constraint violation
          if (orgError.code === "23505") {
            throw new Error(
              "This subdomain is already taken. Please choose another one.",
            );
          }
          throw orgError;
        }

        if (!workspace) {
          throw new Error("Failed to create workspace");
        }

        // 2. Create the membership using admin client (bypasses RLS)
        const { error: membershipError } = await adminClient
          .from("memberships")
          .insert({
            user_id: userId,
            organization_id: workspace.id,
            role: "admin",
          });

        if (membershipError) {
          // Rollback: delete the organization
          await adminClient
            .from("organizations")
            .delete()
            .eq("id", workspace.id);
          throw new Error("Failed to create membership");
        }

        // Return the created workspace
        return {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        };
      },
      {
        service: "OrganizationService",
        method: "createWorkspace",
      },
    );
  }

  static async getWorkspaceUsers(
    organizationId: string,
    context: "client" | "server" = "client",
  ) {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_workspace_users", {
          p_org_id: organizationId,
        });

        if (error) throw error;
        return data || [];
      },
      {
        service: "OrganizationService",
        method: "getWorkspaceUsers",
        userId,
      },
    );
  }

  // Add this method to your OrganizationService class

  /**
   * Get all organizations a user belongs to
   */
  static async getUserOrganizations(
    userId: string,
    context: "server" | "client" = "server",
  ): Promise<OrganizationWithRole[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("memberships")
          .select(
            `
            role,
            organizations (*)
          `,
          )
          .eq("user_id", userId);

        if (error) throw error;
        if (!data) return [];

        // Transform the data to include role with organization
        return data.map((membership: any) => ({
          ...membership.organizations,
          role: membership.role,
        }));
      },
      {
        service: "OrganizationService",
        method: "getUserOrganizations",
        userId,
      },
    );
  }

  /**
   * Update organization details (name, theme, etc.)
   */
  static async updateOrganization(
    organizationId: string,
    updates: {
      name?: string;
      theme?: "light" | "dark" | "solarized";
    },
    context: "client" | "server" = "client",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Validate user has permission (owner or admin)
        const { data: membership, error: membershipError } = await client
          .from("memberships")
          .select("role")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .single();

        if (membershipError) throw membershipError;
        if (!membership || membership.role !== "admin") {
          throw new Error(
            "You do not have permission to update this organization.",
          );
        }

        // Validate inputs
        if (updates.name !== undefined) {
          const trimmedName = updates.name.trim();
          if (!trimmedName) {
            throw new Error("Organization name cannot be empty");
          }
          if (trimmedName.length > 100) {
            throw new Error(
              "Organization name must be less than 100 characters",
            );
          }
          updates.name = trimmedName;
        }

        if (updates.theme !== undefined) {
          if (!["light", "dark", "solarized"].includes(updates.theme)) {
            throw new Error("Invalid theme selected");
          }
        }

        // Update organization
        const { error: updateError } = await client
          .from("organizations")
          .update(updates)
          .eq("id", organizationId);

        if (updateError) throw updateError;
      },
      {
        service: "OrganizationService",
        method: "updateOrganization",
        userId,
      },
    );
  }

  /** Upload a logo for an organization */
  static async uploadLogo(
    organizationId: string,
    file: File,
    context: "client" | "server" = "client",
  ): Promise<string> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // 1. Validate file type and size
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed.");
        }
        if (file.size > 3 * 1024 * 1024) {
          throw new Error("Logo must be smaller than 3MB.");
        }

        // 2. Validate user has permission (owner or admin)
        const { data: membership, error: membershipError } = await client
          .from("memberships")
          .select("role")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .single();

        if (membershipError) throw membershipError;
        if (!membership || !["admin", "admin"].includes(membership.role)) {
          throw new Error("You do not have permission to update this logo.");
        }

        // 3. Get organization slug (needed for bucket path)
        const { data: org, error: orgError } = await client
          .from("organizations")
          .select("slug")
          .eq("id", organizationId)
          .single();

        if (orgError) throw orgError;
        if (!org) throw new Error("Organization not found");

        const bucket = `org-${org.slug}`;
        const filePath = `logo/${Date.now()}-${file.name}`;

        // 4. Upload to storage bucket
        const { error: uploadError } = await client.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 5. Get public URL
        const {
          data: { publicUrl },
        } = client.storage.from(bucket).getPublicUrl(filePath);

        // 6. Save URL to DB
        const { error: updateError } = await client
          .from("organizations")
          .update({ logo_url: publicUrl })
          .eq("id", organizationId);

        if (updateError) throw updateError;

        return publicUrl;
      },
      {
        service: "OrganizationService",
        method: "uploadLogo",
      },
    );
  }

  /**
   * Get organization details by ID
   */
  static async getOrganization(
    organizationId: string,
    context: "server" | "client" = "client",
  ): Promise<OrganizationData> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("organizations")
          .select("*")
          .eq("id", organizationId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Organization not found");

        return data;
      },
      {
        service: "OrganizationService",
        method: "getOrganization",
      },
    );
  }

  static async getOrganizationUsingSlug(
    slug: string,
    context: "server" | "client" = "client",
  ): Promise<OrganizationData> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("organizations")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Organization not found");

        return data;
      },
      {
        service: "OrganizationService",
        method: "getOrganizationUsingSlug",
      },
    );
  }

  /**
   * Remove logo from organization
   */
  static async removeLogo(
    organizationId: string,
    context: "client" | "server" = "client",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Validate user has permission (owner or admin)
        const { data: membership, error: membershipError } = await client
          .from("memberships")
          .select("role")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .single();

        if (membershipError) throw membershipError;
        if (!membership || !["admin", "admin"].includes(membership.role)) {
          throw new Error("You do not have permission to remove this logo.");
        }

        // Remove logo URL from database
        const { error: updateError } = await client
          .from("organizations")
          .update({ logo_url: null })
          .eq("id", organizationId);

        if (updateError) throw updateError;
      },
      {
        service: "OrganizationService",
        method: "removeLogo",
      },
    );
  }

  // ==========================================
  // Membership - Invitations and roles
  // ==========================================

  /**
   * Invite a user by email to the workspace with a given role
   */
  /**
   * Invite a user by email to the workspace with a given role
   * Creates/finds the user account and adds them as a member immediately
   */
  /**
   * Invite a user by email to the workspace with a given role
   * Creates/finds the user account and adds them as a member immediately
   */
  /**
   * Invite a user by email to the workspace with a given role
   * Creates/finds the user account and adds them as a member immediately
   */
  static async inviteUser(
    organizationId: string,
    email: string,
    role: "admin" | "moderator" | "viewer" | "guest",
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        // When called from client, use API route
        if (context === "client") {
          const response = await fetch("/api/organizations/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              organizationId,
              email,
              role,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to send invitation");
          }

          return;
        }

        // When called from server, use admin client directly
        const client = await this.getClient(context);
        const adminClient = this.getAdminClient();

        const normalizedEmail = email.toLowerCase().trim();

        // Get organization info
        const { data: organization, error: orgError } = await client
          .from("organizations")
          .select("name, slug")
          .eq("id", organizationId)
          .single();

        if (orgError) throw orgError;
        if (!organization) {
          throw new Error("Organization not found");
        }

        // Check if user already exists
        const { data: existingUsers, error: listError } =
          await adminClient.auth.admin.listUsers();

        if (listError) throw listError;

        const userExists = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail,
        );

        let invitedUserId: string;

        if (userExists) {
          // User exists, check if already a member
          const { data: existingMembership } = await client
            .from("memberships")
            .select("id")
            .eq("user_id", userExists.id)
            .eq("organization_id", organizationId)
            .maybeSingle();

          if (existingMembership) {
            throw new Error(
              "This user is already a member of this organization",
            );
          }

          invitedUserId = userExists.id;
        } else {
          // Create new user account via admin API (without pre-filling name)
          const { data: newUser, error: createError } =
            await adminClient.auth.admin.createUser({
              email: normalizedEmail,
              email_confirm: false, // They'll confirm via magic link
            });

          if (createError || !newUser.user) {
            throw new Error(
              `Failed to create user account: ${createError?.message}`,
            );
          }

          invitedUserId = newUser.user.id;
        }

        // Add membership record
        const { error: membershipError } = await client
          .from("memberships")
          .insert({
            user_id: invitedUserId,
            organization_id: organizationId,
            role,
          });

        if (membershipError) {
          throw membershipError;
        }

        // Build invitation link to organization's subdomain
        const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
        const protocol =
          process.env.NODE_ENV === "production" ? "https" : "http";
        const inviteLink = `${protocol}://${organization.slug}.${baseDomain}/ideas`;

        // Send magic link email (NOT invite email)
        const { error: magicLinkError } =
          await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: normalizedEmail,
            options: {
              redirectTo: inviteLink,
            },
          });

        if (magicLinkError) {
          console.error("Failed to send magic link email:", magicLinkError);
          // Don't throw - membership is created, they can still access once they sign in
        }
      },
      {
        service: "OrganizationService",
        method: "inviteUser",
        userId,
      },
    );
  }

  /**
   * Change a member's role within a workspace
   */
  static async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: "admin" | "moderator" | "viewer" | "guest",
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Only update if the membership exists
        const { error } = await client
          .from("memberships")
          .update({ role: newRole })
          .eq("user_id", memberId)
          .eq("organization_id", organizationId);

        if (error) throw error;
      },
      {
        service: "OrganizationService",
        method: "updateMemberRole",
      },
    );
  }

  /**
   * Remove a member from a workspace
   */
  static async removeMember(
    organizationId: string,
    memberId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("memberships")
          .delete()
          .eq("user_id", memberId)
          .eq("organization_id", organizationId);

        if (error) throw error;
      },
      {
        service: "OrganizationService",
        method: "removeMember",
      },
    );
  }
}
