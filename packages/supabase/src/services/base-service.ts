import { createClient as createClientSupabaseClient } from "../lib/clients/client";
import { createClient as createServerSupabaseClient } from "../lib/clients/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST: 200, // Green: Under 200ms
  MODERATE: 1000, // Yellow: 200ms - 1000ms
  SLOW: 1000, // Red: Over 1000ms
};

// Console colors
const COLORS = {
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  BLUE: "\x1b[34m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};

interface ServiceContext {
  service: string;
  method: string;
  userId?: string;
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export abstract class ServiceBase {
  // Get appropriate Supabase client
  protected static async getClient(
    context: "server" | "client" = "server",
  ): Promise<SupabaseClient> {
    return context === "server"
      ? await createServerSupabaseClient()
      : createClientSupabaseClient();
  }

  // Get admin client with service role key for privileged operations
  protected static getAdminClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing Supabase environment variables for admin operations",
      );
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  // Main execution wrapper with performance monitoring
  protected static async execute<T>(
    operation: () => Promise<T>,
    context: ServiceContext,
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      // Execute the operation
      const result = await operation();

      // Calculate duration
      const duration = performance.now() - startTime;

      // Log performance only in development
      if (process.env.NODE_ENV === "development") {
        this.logPerformance({
          ...context,
          duration,
          success: true,
          timestamp,
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Log error performance only in development
      if (process.env.NODE_ENV === "development") {
        this.logPerformance({
          ...context,
          duration,
          success: false,
          error: error,
          timestamp,
        });
      }

      // Convert to human-readable error
      throw this.createHumanError(error);
    }
  }

  // Performance logging with colors (only runs in development)
  private static logPerformance(data: {
    service: string;
    method: string;
    duration: number;
    success: boolean;
    timestamp: string;
    userId?: string;
    error?: any;
  }) {
    const { service, method, duration, success, timestamp, userId, error } =
      data;

    // Determine color based on performance
    let color = COLORS.GREEN;
    let status = "🟢 FAST";

    if (duration > PERFORMANCE_THRESHOLDS.SLOW) {
      color = COLORS.RED;
      status = "🔴 SLOW";
    } else if (duration > PERFORMANCE_THRESHOLDS.FAST) {
      color = COLORS.YELLOW;
      status = "🟡 MODERATE";
    }

    // Format duration
    const formattedDuration = duration.toFixed(2);

    // Create log message
    const successIcon = success ? "✅" : "❌";
    const userInfo = userId ? ` [User: ${userId}]` : "";

    console.log(
      `${color}${COLORS.BOLD}[${timestamp}] ${successIcon} ${service}.${method}${userInfo}${COLORS.RESET}\n` +
        `${color}  ⏱️  Duration: ${formattedDuration}ms ${status}${COLORS.RESET}`,
    );

    // Log error details if failed
    if (!success && error) {
      console.log(
        `${COLORS.RED}  ❌ Error: ${error.message || "Unknown error"}${COLORS.RESET}`,
      );

      // Log stack trace in development (redundant check but kept for clarity)
      if (error.stack) {
        console.log(`${COLORS.RED}  📋 Stack: ${error.stack}${COLORS.RESET}`);
      }
    }

    // Warn about slow queries
    if (duration > PERFORMANCE_THRESHOLDS.SLOW) {
      console.log(
        `${COLORS.RED}${COLORS.BOLD}  ⚠️  OPTIMIZATION NEEDED: This query is taking too long!${COLORS.RESET}`,
      );
    }

    console.log(""); // Empty line for readability
  }

  // Convert technical errors to human-readable messages
  private static createHumanError(error: any): ServiceError {
    // If error is already a ServiceError, return it as-is
    if (error instanceof ServiceError) {
      return error;
    }

    let humanMessage: string;
    let errorCode: string | undefined;

    // Extract the error message
    const errorMessage = error?.message || "";

    // Check if this is already a user-friendly error message
    // User-friendly messages are typically longer and don't contain technical jargon
    const isUserFriendly =
      errorMessage.length > 20 &&
      !errorMessage.includes("PGRST") &&
      !errorMessage.includes("JWT") &&
      !errorMessage.includes("fetch failed") &&
      !errorMessage.includes("SocketError") &&
      !errorMessage.toLowerCase().includes("constraint") &&
      (errorMessage.includes("already registered") ||
        errorMessage.includes("already taken") ||
        errorMessage.includes("different email") ||
        errorMessage.includes("sign in") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("not authorized") ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("required") ||
        errorMessage.includes("must be") ||
        errorMessage.includes("cannot") ||
        errorMessage.includes("unable to") ||
        errorMessage.includes("please"));

    // If it's already user-friendly, use it directly
    if (isUserFriendly) {
      return new ServiceError(errorMessage, error, "USER_ERROR");
    }

    // Handle common Supabase errors
    if (error?.code === "PGRST116") {
      humanMessage = "The requested item was not found";
      errorCode = "NOT_FOUND";
    } else if (
      error?.code === "23505" ||
      errorMessage.toLowerCase().includes("duplicate")
    ) {
      humanMessage = "This item already exists";
      errorCode = "DUPLICATE";
    } else if (
      error?.code === "42501" ||
      errorMessage.toLowerCase().includes("permission")
    ) {
      humanMessage = "You do not have permission to perform this action";
      errorCode = "PERMISSION_DENIED";
    } else if (error?.code === "23503") {
      humanMessage = "Cannot complete this action due to related data";
      errorCode = "CONSTRAINT_VIOLATION";
    } else if (
      errorMessage.includes("JWT") ||
      errorMessage.toLowerCase().includes("auth") ||
      errorMessage.toLowerCase().includes("session")
    ) {
      humanMessage = "Your session has expired. Please sign in again";
      errorCode = "AUTH_EXPIRED";
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("SocketError")
    ) {
      humanMessage =
        "Connection problem. Please check your internet and try again";
      errorCode = "NETWORK_ERROR";
    } else if (errorMessage) {
      // If there's a message but it's not user-friendly, use it but mark as technical
      humanMessage = errorMessage;
      errorCode = "TECHNICAL_ERROR";
    } else {
      // Generic fallback
      humanMessage = "Something went wrong. Please try again";
      errorCode = "UNKNOWN_ERROR";
    }

    return new ServiceError(humanMessage, error, errorCode);
  }

  // Helper for getting current user ID (useful for logging)
  protected static async getCurrentUserId(
    context: "server" | "client" = "server",
  ): Promise<string | null> {
    try {
      const client = await this.getClient(context);
      const {
        data: { user },
        error,
      } = await client.auth.getUser();

      if (error || !user) return null;
      return user.id;
    } catch {
      return null;
    }
  }
}
