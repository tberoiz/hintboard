import { ServiceBase } from "./base-service";
import type { User } from "@supabase/supabase-js";

export interface ProfileData {
  fullName?: string;
  avatarUrl?: string;
}

const ANONYMOUS_NAMES = [
  "Indri",
  "Falcon",
  "Phoenix",
  "Raven",
  "Wolf",
  "Eagle",
  "Lynx",
  "Otter",
  "Puma",
  "Cobra",
  "Tiger",
  "Leopard",
  "Hawk",
  "Bear",
  "Fox",
  "Owl",
  "Panther",
  "Jaguar",
  "Cheetah",
  "Mongoose",
];

/**
 * User Service - Handles all user-related operations
 * Methods read like natural conversations
 */
export class UserService extends ServiceBase {
  // ==========================================
  // Authentication - Simple actions
  // ==========================================

  /**
   * Create anonymous user with random name
   * Only called when user takes an action (vote, comment, etc)
   */
  static async createAnonymousUser(): Promise<User> {
    return this.execute(
      async () => {
        const client = await this.getClient("client");

        // Check if already has session
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.user) {
          return session.user;
        }

        // Generate random anonymous name
        const randomName =
          ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];
        const anonymousName = `Anonymous ${randomName}`;

        const { data, error } = await client.auth.signInAnonymously({
          options: {
            data: {
              full_name: anonymousName,
            },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error("Failed to create anonymous user");

        return data.user;
      },
      {
        service: "UserService",
        method: "createAnonymousUser",
      },
    );
  }

  // Add this new method to UserService class

  /**
   * Check if an email is already in use by another user
   */
  static async isEmailTaken(
    email: string,
    context: "server" | "client" = "client",
  ): Promise<boolean> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Get current user ID if exists
        const {
          data: { user: currentUser },
        } = await client.auth.getUser();

        // Query admin endpoint to check if email exists
        // Note: This requires RPC function or admin API access
        // Alternative: Use a backend API route for this check

        // For now, we'll try to sign in with OTP to the email
        // If it succeeds, email exists. This is a workaround.
        // Better solution: create a backend API route that uses admin client

        try {
          // Use admin client if on server
          if (context === "server") {
            const adminClient = this.getAdminClient();
            const { data, error } = await adminClient.auth.admin.listUsers();

            if (error) throw error;

            // Check if any user (other than current user) has this email
            const emailExists = data.users.some(
              (user) =>
                user.email?.toLowerCase() === email.toLowerCase() &&
                user.id !== currentUser?.id,
            );

            return emailExists;
          } else {
            // On client, we need to call a backend API
            // This will be handled in the API route below
            throw new Error("Email check must be done on server side");
          }
        } catch (error) {
          console.error("Error checking email:", error);
          throw error;
        }
      },
      {
        service: "UserService",
        method: "isEmailTaken",
      },
    );
  }

  /**
   * Convert anonymous to real user by adding email
   * Supabase will automatically send a verification email
   */
  static async convertAnonymousToRealWithEmail(
    email: string,
    fullName?: string,
    currentSubdomain?: string,
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient("server");

        // Get current user to verify they're anonymous
        const {
          data: { user: currentUser },
        } = await client.auth.getUser();

        if (!currentUser?.is_anonymous) {
          throw new Error("User is not anonymous");
        }

        // Build the email redirect URL with subdomain preservation
        let emailRedirectTo: string | undefined;
        const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
        const protocol =
          process.env.NODE_ENV === "production" ? "https" : "http";

        if (currentSubdomain) {
          // If on a subdomain, preserve it in the callback URL
          emailRedirectTo = `${protocol}://${currentSubdomain}.${baseDomain}/api/auth/callback`;
          console.log("📧 Setting subdomain redirect:", emailRedirectTo);
        } else {
          // If on main domain, use main domain
          emailRedirectTo = `${protocol}://${baseDomain}/api/auth/callback`;
          console.log("📧 Setting main domain redirect:", emailRedirectTo);
        }

        // Update user with email and name
        // Supabase automatically sends verification email
        const { error } = await client.auth.updateUser(
          {
            email: email.trim().toLowerCase(),
            data: {
              full_name:
                fullName?.trim() ||
                currentUser.user_metadata?.full_name ||
                "Anonymous User",
            },
          },
          {
            emailRedirectTo,
          },
        );

        if (error) {
          // Handle specific Supabase errors
          if (
            error.message.includes("email") &&
            error.message.includes("already")
          ) {
            throw new Error(
              "This email is already registered. Please use a different email or sign in.",
            );
          }
          throw error;
        }

        console.log("✅ Anonymous account conversion initiated");
        console.log("   User will receive verification email");
        console.log("   Redirect will go to:", emailRedirectTo);
        // Success! User will receive verification email from Supabase
      },
      {
        service: "UserService",
        method: "convertAnonymousToRealWithEmail",
      },
    );
  }

  /**
   * Check if current user is anonymous
   */
  static async isAnonymous(
    context: "server" | "client" = "client",
  ): Promise<boolean> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) return false;

    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) return false;

        return user.is_anonymous === true;
      },
      {
        service: "UserService",
        method: "isAnonymous",
        userId: userId || undefined,
      },
    );
  }

  /**
   * Get user info including anonymous status
   */
  static async getUserInfo(context: "server" | "client" = "client"): Promise<{
    id: string;
    email: string | undefined;
    fullName: string | undefined;
    avatarUrl: string | undefined;
    isAnonymous: boolean;
  } | null> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name,
          avatarUrl: user.user_metadata?.avatar_url,
          isAnonymous: user.is_anonymous === true,
        };
      },
      {
        service: "UserService",
        method: "getUserInfo",
      },
    );
  }

  /**
   * Require authentication for an action
   * Creates anonymous user if no session exists
   * Returns user info
   */
  static async requireAuth(): Promise<{
    id: string;
    email: string | undefined;
    fullName: string | undefined;
    avatarUrl: string | undefined;
    isAnonymous: boolean;
    justCreated: boolean;
  }> {
    return this.execute(
      async () => {
        const client = await this.getClient("client");

        // Check if user already has a session
        const {
          data: { user: existingUser },
        } = await client.auth.getUser();

        if (existingUser) {
          return {
            id: existingUser.id,
            email: existingUser.email,
            fullName: existingUser.user_metadata?.full_name,
            avatarUrl: existingUser.user_metadata?.avatar_url,
            isAnonymous: existingUser.is_anonymous === true,
            justCreated: false,
          };
        }

        // Create anonymous user
        const newUser = await this.createAnonymousUser();

        return {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.user_metadata?.full_name,
          avatarUrl: newUser.user_metadata?.avatar_url,
          isAnonymous: newUser.is_anonymous === true,
          justCreated: true,
        };
      },
      {
        service: "UserService",
        method: "requireAuth",
      },
    );
  }

  /**
   * Sign up with email and password
   * Returns redirect URL and whether email confirmation is needed
   */
  /**
   * Sign up with email and password
   * Returns redirect URL and whether email confirmation is needed
   */
  /**
   * Sign up with email and password
   * Returns redirect URL and whether email confirmation is needed
   */
  static async signUpWithPassword(
    email: string,
    password: string,
    fullName: string,
    currentSubdomain?: string, // Add subdomain parameter
  ): Promise<{
    user: User;
    redirectTo: string;
    needsEmailConfirmation: boolean;
    subdomain?: string;
  }> {
    return this.execute(
      async () => {
        const client = await this.getClient("client");

        // Build the emailRedirectTo URL with proper subdomain handling
        let emailRedirectTo: string | undefined;

        if (typeof window !== "undefined") {
          const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000";
          const protocol =
            process.env.NODE_ENV === "production" ? "https" : "http";

          if (currentSubdomain) {
            // If on a subdomain, preserve it in the callback URL
            emailRedirectTo = `${protocol}://${currentSubdomain}.${baseDomain}/api/auth/callback`;
          } else {
            // If on main domain, use main domain
            emailRedirectTo = `${protocol}://${baseDomain}/api/auth/callback`;
          }
        }

        console.log("📧 Signup with emailRedirectTo:", emailRedirectTo);

        const { data, error } = await client.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error(
              "This email is already registered. Please sign in instead.",
            );
          }
          throw error;
        }

        if (!data.user) {
          throw new Error("Failed to create user");
        }

        // Check if email confirmation is required
        const needsEmailConfirmation = !data.session;

        console.log("📧 Signup result:", {
          userId: data.user.id,
          email: data.user.email,
          needsEmailConfirmation,
          hasSession: !!data.session,
          subdomain: currentSubdomain,
        });

        // If email confirmation is needed, redirect to a confirmation page
        if (needsEmailConfirmation) {
          return {
            user: data.user,
            redirectTo: `/verify-email?email=${encodeURIComponent(email)}`,
            needsEmailConfirmation: true,
          };
        }

        // If session exists (email confirmation disabled), proceed with normal flow
        // Wait for session to establish
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Determine redirect destination based on where they signed up
        let redirectTo: string;

        if (currentSubdomain) {
          // User signed up on a subdomain - stay on that subdomain and go to ideas
          // They will become a guest/member of that organization
          redirectTo = `/ideas`;
        } else {
          // User signed up on main domain - check if they have organizations
          const { data: memberships } = await client
            .from("memberships")
            .select(
              `
                role,
                organizations (
                  id,
                  name,
                  slug
                )
              `,
            )
            .eq("user_id", data.user.id);

          const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "hintboard.app";
          const protocol =
            process.env.NODE_ENV === "production" ? "https" : "http";

          if (memberships && memberships.length > 0) {
            // Redirect to first organization
            const firstOrg = memberships[0]?.organizations as any;
            const orgSubdomain = firstOrg?.slug || firstOrg?.id;
            if (orgSubdomain) {
              redirectTo = `${protocol}://${orgSubdomain}.${baseDomain}/ideas`;
            } else {
              // Fallback to organizations page if no valid slug
              redirectTo = "/organizations";
            }
          } else {
            // No memberships - redirect to create organization
            redirectTo = "/organizations";
          }
        }

        return {
          user: data.user,
          redirectTo,
          needsEmailConfirmation: false,
        };
      },
      {
        service: "UserService",
        method: "signUpWithPassword",
      },
    );
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient("client");

        const protocol =
          process.env.NODE_ENV === "production" ? "https" : "http";
        const baseUrl = (
          process.env.NEXT_PUBLIC_APP_URL || "lvh.me:3000"
        ).replace(/^https?:\/\//, "");
        const redirectTo = `${protocol}://${baseUrl}/reset-password`;

        console.log("🔐 Sending password reset email");
        console.log("   Email:", email);
        console.log("   Redirect to:", redirectTo);

        const { error } = await client.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo,
          },
        );

        if (error) {
          console.error("❌ Failed to send reset email:", error);
          throw error;
        }

        console.log("✅ Password reset email sent successfully");
      },
      {
        service: "UserService",
        method: "sendPasswordResetEmail",
      },
    );
  }

  /**
   * Update password (used after reset or for changing password)
   */
  static async updatePassword(
    newPassword: string,
    context: "server" | "client" = "client",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw error;
        }
      },
      {
        service: "UserService",
        method: "updatePassword",
        userId: userId || undefined,
      },
    );
  }
  /**
   * Sign in with email and password
   */
  static async signInWithPassword(
    email: string,
    password: string,
  ): Promise<{ user: User; redirectTo: string }> {
    return this.execute(
      async () => {
        const client = await this.getClient("client");

        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password");
          }
          throw error;
        }

        if (!data.user) {
          throw new Error("Failed to sign in");
        }

        // Wait for session to establish
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get current subdomain from window location
        let currentSubdomain: string | null = null;

        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const subdomainParam = urlParams.get("subdomain");

          if (subdomainParam) {
            currentSubdomain = subdomainParam;
          } else if (window.location?.host) {
            const host = window.location.host;
            const hostWithoutPort = host.split(":")[0];
            const parts = hostWithoutPort?.split(".") || [];

            if (
              parts.length === 2 &&
              parts[1] === "localhost" &&
              parts[0] &&
              parts[0] !== "www"
            ) {
              currentSubdomain = parts[0];
            } else if (parts.length >= 3 && parts[0] && parts[0] !== "www") {
              currentSubdomain = parts[0];
            }
          }
        }

        // Check if user has organizations
        const { data: memberships } = await client
          .from("memberships")
          .select(
            `
            role,
            organizations (
              id,
              name,
              slug
            )
          `,
          )
          .eq("user_id", data.user.id);

        // Determine redirect destination
        const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "hintboard.app";
        const protocol =
          process.env.NODE_ENV === "production" ? "https" : "http";
        let redirectTo: string;

        if (currentSubdomain) {
          // Stay on current subdomain and go to ideas
          redirectTo = `${protocol}://${currentSubdomain}.${baseDomain}/ideas`;
        } else if (memberships && memberships.length > 0) {
          // Redirect to first organization
          const firstOrg = memberships[0]?.organizations as any;
          const orgSubdomain = firstOrg?.slug || firstOrg?.id;
          if (orgSubdomain) {
            redirectTo = `${protocol}://${orgSubdomain}.${baseDomain}/ideas`;
          } else {
            // Fallback to organizations page if no valid slug
            redirectTo = "/organizations";
          }
        } else {
          // No memberships - redirect to create organization
          redirectTo = "/organizations";
        }

        return {
          user: data.user,
          redirectTo,
        };
      },
      {
        service: "UserService",
        method: "signInWithPassword",
      },
    );
  }

  /**
   * Sign in with email OTP (One-Time Password)
   */
  static async signInWithOTP(email: string): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient("client");

        // Add retry logic for connection issues
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { error } = await client.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
              },
            });

            if (error) throw error;
            return; // Success, exit retry loop
          } catch (error) {
            lastError = error as Error;

            // If it's a connection error and not the last attempt, wait and retry
            if (
              attempt < 3 &&
              error instanceof Error &&
              (error.message.includes("fetch failed") ||
                error.message.includes("SocketError") ||
                error.message.includes("other side closed"))
            ) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt),
              ); // Exponential backoff
              continue;
            }

            throw error; // Re-throw if it's the last attempt or not a connection error
          }
        }

        throw (
          lastError || new Error("Failed to send OTP after multiple attempts")
        );
      },
      {
        service: "UserService",
        method: "signInWithOTP",
      },
    );
  }

  /**
   * Verify OTP token for email authentication
   * Uses client-side verification to properly set session cookies
   */
  static async verifyOTP(
    email: string,
    token: string,
  ): Promise<{ user: User; redirectTo: string }> {
    return this.execute(
      async () => {
        console.log("=== CLIENT-SIDE OTP VERIFICATION START ===");
        console.log("Email:", email);
        console.log(
          "Token:",
          token ? `${token.substring(0, 2)}****` : "missing",
        );
        console.log(
          "Current URL:",
          typeof window !== "undefined" ? window.location.href : "N/A",
        );
        console.log("Timestamp:", new Date().toISOString());

        const client = await this.getClient("client");

        // Add retry logic for connection issues
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(
              `Attempt ${attempt}/3 - Calling Supabase verifyOtp directly...`,
            );
            const verifyStartTime = Date.now();

            const { data, error } = await client.auth.verifyOtp({
              email,
              token,
              type: "email",
            });

            const verifyDuration = Date.now() - verifyStartTime;
            console.log(`Supabase verifyOtp completed in ${verifyDuration}ms`);

            if (error) {
              console.error("❌ Supabase verifyOtp error:", {
                message: error.message,
                status: error.status,
                code: (error as any).code,
                name: error.name,
              });

              if (
                error.message?.includes("expired") ||
                error.message?.includes("invalid")
              ) {
                throw new Error(
                  "The verification code has expired or is invalid. Please request a new code.",
                );
              }

              if (error.message?.includes("already")) {
                throw new Error(
                  "This verification code has already been used. Please request a new code.",
                );
              }

              if (
                error.message?.includes("rate") ||
                error.message?.includes("too many") ||
                (error as any).status === 429
              ) {
                throw new Error(
                  "Too many attempts. Please wait 5 minutes and try again.",
                );
              }

              throw new Error(error.message || "Verification failed");
            }

            if (!data.user) {
              throw new Error("No user returned from verification");
            }

            console.log("✅ OTP verified successfully");
            console.log("User ID:", data.user.id);
            console.log("User Email:", data.user.email);

            // Wait for session to establish
            console.log("Waiting for session to establish...");
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Verify session was set
            const {
              data: { session },
            } = await client.auth.getSession();
            console.log("Session established:", !!session);

            // Check if user has organizations
            console.log("Fetching user memberships...");
            const { data: memberships, error: membershipError } = await client
              .from("memberships")
              .select(
                `
                  role,
                  organizations (
                    id,
                    name,
                    slug
                  )
                `,
              )
              .eq("user_id", data.user.id);

            if (membershipError) {
              console.error("Error fetching memberships:", membershipError);
            } else {
              console.log("Memberships found:", memberships?.length || 0);
            }

            // Get current subdomain from window location
            let currentSubdomain: string | null = null;

            if (typeof window !== "undefined") {
              const urlParams = new URLSearchParams(window.location.search);
              const subdomainParam = urlParams.get("subdomain");

              if (subdomainParam) {
                currentSubdomain = subdomainParam;
                console.log("Subdomain from URL param:", currentSubdomain);
              } else if (window.location?.host) {
                const host = window.location.host;
                const hostWithoutPort = host.split(":")[0];
                const parts = hostWithoutPort?.split(".") || [];

                console.log("Host parts:", parts);

                if (
                  parts.length === 2 &&
                  parts[1] === "localhost" &&
                  parts[0] &&
                  parts[0] !== "www"
                ) {
                  currentSubdomain = parts[0];
                } else if (
                  parts.length >= 3 &&
                  parts[0] &&
                  parts[0] !== "www"
                ) {
                  currentSubdomain = parts[0];
                }

                console.log("Detected subdomain:", currentSubdomain || "none");
              }
            }

            // Determine redirect destination
            const baseDomain =
              process.env.NEXT_PUBLIC_APP_URL || "hintboard.app";
            const protocol =
              process.env.NODE_ENV === "production" ? "https" : "http";
            let redirectTo: string;

            if (currentSubdomain) {
              redirectTo = `${protocol}://${currentSubdomain}.${baseDomain}/ideas`;
              console.log("Redirecting to subdomain:", redirectTo);
            } else if (memberships && memberships.length > 0) {
              const firstOrg = memberships[0]?.organizations as any;
              const orgSubdomain = firstOrg?.slug || firstOrg?.id;
              if (orgSubdomain) {
                redirectTo = `${protocol}://${orgSubdomain}.${baseDomain}/ideas`;
                console.log("Redirecting to user's organization:", redirectTo);
              } else {
                redirectTo = "/organizations";
                console.log(
                  "No valid org slug, redirecting to organizations page",
                );
              }
            } else {
              redirectTo = "/organizations";
              console.log(
                "No orgs, redirecting to organizations page:",
                redirectTo,
              );
            }

            console.log("=== CLIENT-SIDE OTP VERIFICATION END ===\n");

            return {
              user: data.user,
              redirectTo,
            };
          } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed:`, error);

            // Don't retry for expired/invalid tokens or rate limits
            if (
              error instanceof Error &&
              (error.message.includes("expired") ||
                error.message.includes("invalid") ||
                error.message.includes("already") ||
                error.message.includes("rate") ||
                error.message.includes("too many"))
            ) {
              console.error("Non-retryable error, throwing immediately");
              throw error;
            }

            // Retry for connection errors
            if (
              attempt < 3 &&
              error instanceof Error &&
              (error.message.includes("fetch failed") ||
                error.message.includes("Failed to fetch") ||
                error.message.includes("NetworkError") ||
                error.message.includes("SocketError") ||
                error.message.includes("other side closed"))
            ) {
              const delay = 1000 * attempt;
              console.log(`Connection error, retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            throw error;
          }
        }

        console.error("All retry attempts exhausted");
        console.log("=== CLIENT-SIDE OTP VERIFICATION END (FAILED) ===\n");
        throw (
          lastError || new Error("Failed to verify OTP after multiple attempts")
        );
      },
      {
        service: "UserService",
        method: "verifyOTP",
      },
    );
  }

  /**
   * Get the currently signed-in user
   */
  static async getCurrentUser(
    context: "server" | "client" = "server",
  ): Promise<User> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const {
          data: { user },
          error,
        } = await client.auth.getUser();

        if (error) throw error;
        if (!user) throw new Error("No user found");

        return user;
      },
      {
        service: "UserService",
        method: "getCurrentUser",
        userId: userId || undefined,
      },
    );
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(
    customRedirectTo?: string,
  ): Promise<{ url: string }> {
    const client = await this.getClient("client"); // OAuth must be client-side
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          customRedirectTo || `${process.env.NEXT_PUBLIC_GOOGLE_AUTH_CALLBACK}`,
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error("No redirect URL returned from OAuth");
    return { url: data.url };
  }

  /**
   * Sign out the current user
   */
  static async signOut(context: "server" | "client" = "client"): Promise<void> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const { error } = await client.auth.signOut();

        if (error) throw error;
      },
      {
        service: "UserService",
        method: "signOut",
        userId: userId || undefined,
      },
    );
  }

  // ==========================================
  // Profile - User data operations
  // ==========================================
  /**
   * Update user profile information
   * IMPORTANT: Supabase auth stores metadata with snake_case keys
   */
  static async updateProfile(
    data: { full_name?: string; avatar_url?: string },
    context: "server" | "client" = "server",
  ): Promise<User> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Build update data object
        const updateData: Record<string, any> = {};

        if (data.full_name !== undefined) {
          updateData.full_name = data.full_name;
        }

        if (data.avatar_url !== undefined) {
          updateData.avatar_url = data.avatar_url;
        }

        console.log("Updating user profile with data:", updateData);

        const {
          data: { user },
          error,
        } = await client.auth.updateUser({
          data: updateData,
        });

        if (error) {
          console.error("Profile update error:", error);
          throw error;
        }

        if (!user) {
          throw new Error("Failed to update user profile");
        }

        console.log("Profile updated successfully:", user.user_metadata);
        return user;
      },
      {
        service: "UserService",
        method: "updateProfile",
        userId: userId || undefined,
      },
    );
  }

  /**
   * Upload and set new avatar image
   */
  static async uploadAvatar(
    file: File,
    context: "server" | "client" = "client",
  ): Promise<string> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        if (!userId) throw new Error("User not authenticated");

        console.log("Uploading avatar for user:", userId);
        console.log("File info:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        // Upload to Supabase storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/avatar.${fileExt}`;

        console.log("Uploading to path:", fileName);

        const { data: uploadData, error: uploadError } = await client.storage
          .from("avatars")
          .upload(fileName, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        console.log("Upload successful:", uploadData);

        // Get public URL
        const {
          data: { publicUrl },
        } = client.storage.from("avatars").getPublicUrl(fileName);

        console.log("Public URL:", publicUrl);

        // Update user profile with new avatar URL
        await this.updateProfile({ avatar_url: publicUrl }, context);

        return publicUrl;
      },
      {
        service: "UserService",
        method: "uploadAvatar",
        userId: userId || undefined,
      },
    );
  }

  /**
   * Delete user account and all associated data
   */
  static async deleteAccount(
    userId: string,
    context: "server" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        // Use admin client for privileged operations
        const adminClient = this.getAdminClient();

        if (!userId) throw new Error("User ID is required");

        // Delete all related data in the correct order
        try {
          // 1. Delete any other related data (add more tables as needed)
          // For example:
          // const { error: deleteOtherDataError } = await adminClient
          //   .from('other_table')
          //   .delete()
          //   .eq('user_id', userId);

          // 2. Delete the auth user
          const { error: deleteError } =
            await adminClient.auth.admin.deleteUser(userId, false);

          if (deleteError) {
            throw new Error(
              `Failed to delete auth user: ${deleteError.message}`,
            );
          }
        } catch (error) {
          throw new Error(
            `Error during deletion process: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
      {
        service: "UserService",
        method: "deleteAccount",
        userId: userId || undefined,
      },
    );
  }

  // ==========================================
  // Onboarding - Track onboarding completion
  // ==========================================

  /**
   * Get the current user's onboarding status
   */
  static async getUserOnboarding(
    context: "server" | "client" = "server",
  ): Promise<boolean> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        if (!userId) throw new Error("User not authenticated");
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("user_preferences")
          .select("onboarding_completed")
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        return data?.onboarding_completed ?? false;
      },
      {
        service: "UserService",
        method: "getUserOnboarding",
        userId: userId || undefined,
      },
    );
  }

  /**
   * Mark onboarding as completed for the current user
   */
  static async completeUserOnboarding(
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("user_preferences")
          .update({
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) throw error;
      },
      {
        service: "UserService",
        method: "completeUserOnboarding",
        userId: userId || undefined,
      },
    );
  }

  /**
   * Get the user currency
   */
  static async fetchUserCurrency(
    context: "client" | "server" = "client",
  ): Promise<"USD" | "EUR" | undefined> {
    const userId = await this.getCurrentUserId(context);

    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const { data, error } = await client
          .from("user_preferences")
          .select("currency")
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        return data?.currency.toLowerCase() as "USD" | "EUR" | undefined;
      },
      {
        service: "UserService",
        method: "fetchUserCurrency",
        userId: userId || undefined,
      },
    );
  }

  static async updateUserCurrency(
    newCurrency: "usd" | "eur",
    context: "client" | "server" = "client",
  ): Promise<"usd" | "eur"> {
    const userId = await this.getCurrentUserId(context);

    if (!userId) throw new Error("User not found");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("user_preferences")
          .update({ currency: newCurrency.toUpperCase() }) // store as 'USD' or 'EUR'
          .eq("user_id", userId)
          .select("currency")
          .single();

        if (error) throw error;

        // return lowercase to match TypeScript type
        return data.currency.toLowerCase() as "usd" | "eur";
      },
      {
        service: "UserService",
        method: "updateUserCurrency",
        userId,
      },
    );
  }

  // ==========================================
  // Subscription - Simple actions
  // ==========================================

  /**
   * Check if user has active subscription or trial access
   */
  static async checkUserAccess(
    context: "client" | "server" = "server",
  ): Promise<boolean> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) return false;

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Use the simplified database function
        const { data, error } = await client.rpc("user_has_access", {
          user_id: userId,
        });

        if (error) throw error;
        return data as boolean;
      },
      {
        service: "UserService",
        method: "checkUserAccess",
        userId,
      },
    );
  }

  /**
   * Get user subscription status (optional - for displaying in UI)
   */
  static async getSubscriptionStatus(
    context: "client" | "server" = "client",
  ): Promise<{
    hasAccess: boolean;
    isOnTrial: boolean;
    trialEndsAt: string | null;
    hasActiveSubscription: boolean;
  }> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) {
      return {
        hasAccess: false,
        isOnTrial: false,
        trialEndsAt: null,
        hasActiveSubscription: false,
      };
    }

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data: profile, error } = await client
          .from("user_subscriptions")
          .select("has_active_subscription, trial_ends_at")
          .eq("id", userId)
          .single();

        if (error) throw error;

        const now = new Date();
        const trialEndsAt = profile?.trial_ends_at
          ? new Date(profile.trial_ends_at)
          : null;
        const isOnTrial = trialEndsAt ? trialEndsAt > now : false;
        const hasAccess = profile?.has_active_subscription || isOnTrial;

        return {
          hasAccess,
          isOnTrial,
          trialEndsAt: profile?.trial_ends_at || null,
          hasActiveSubscription: profile?.has_active_subscription || false,
        };
      },
      {
        service: "UserService",
        method: "getSubscriptionStatus",
        userId,
      },
    );
  }

  /**
   * Check if user's trial has expired
   */
  static async isTrialExpired(
    context: "client" | "server" = "client",
  ): Promise<boolean> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) {
      return false; // No user means no trial to expire
    }

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data: subscription, error } = await client
          .from("user_subscriptions")
          .select("status, trial_ends_at")
          .eq("user_id", userId)
          .single();

        if (error) {
          // If no subscription record exists, consider trial as expired
          if (error.code === "PGRST116") {
            return true;
          }
          throw error;
        }

        // If user has active subscription, trial is not relevant
        if (subscription?.status === "active") {
          return false;
        }

        // If user is on trial, check if it has expired
        if (subscription?.status === "trialing") {
          if (!subscription.trial_ends_at) {
            return false; // No trial end date means trial is still active
          }

          const now = new Date();
          const trialEndsAt = new Date(subscription.trial_ends_at);
          return trialEndsAt <= now; // Trial expired if end date is in the past
        }

        // For any other status (canceled, past_due), consider trial expired
        return true;
      },
      {
        service: "UserService",
        method: "isTrialExpired",
        userId,
      },
    );
  }

  /**
   * Get the number of days remaining in the user's trial
   * Returns null if user has active subscription or trial has expired
   * Based on user_subscriptions table with columns: status, trial_ends_at
   */
  static async getTrialDaysRemaining(
    context: "client" | "server" = "client",
  ): Promise<number | null> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) {
      return null;
    }

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data: subscription, error } = await client
          .from("user_subscriptions")
          .select("status, trial_ends_at")
          .eq("user_id", userId)
          .single();

        console.log("data", subscription);

        if (error) {
          // If no subscription record exists, no trial to display
          if (error.code === "PGRST116") {
            return null;
          }
          throw error;
        }

        // If user has active paid subscription, don't show trial banner
        if (subscription?.status === "active") {
          return null;
        }

        // If user is on trial and has a trial end date, calculate days remaining
        if (
          subscription?.status === "trialing" &&
          subscription?.trial_ends_at
        ) {
          const now = new Date();
          const trialEndsAt = new Date(subscription.trial_ends_at);
          const diffMs = trialEndsAt.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          // Return days remaining if positive, otherwise null (trial expired)
          return diffDays > 0 ? diffDays : null;
        }

        // For any other status (canceled, past_due, etc.), no trial to show
        return null;
      },
      {
        service: "UserService",
        method: "getTrialDaysRemaining",
        userId,
      },
    );
  }
}
