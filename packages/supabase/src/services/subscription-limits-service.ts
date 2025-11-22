import { ServiceBase } from "./base-service";

export interface PlanLimits {
  planName: string;
  // Limits
  boardsLimit: number;
  emailSubscribersLimit: number;
  aiAnnouncementsLimit: number;
  // Usage
  boardsUsed: number;
  emailSubscribersUsed: number;
  aiAnnouncementsUsed: number;
  // Features
  customDomain: boolean;
  removeBranding: boolean;
  linearIntegration: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  multipleTeamMembers: boolean;
  ssoSaml: boolean;
}

export type LimitType = "boards" | "email_subscribers" | "ai_announcements";
export type FeatureType =
  | "customDomain"
  | "removeBranding"
  | "linearIntegration"
  | "advancedAnalytics"
  | "apiAccess"
  | "multipleTeamMembers"
  | "ssoSaml";

/**
 * Subscription Limits Service - Simple usage tracking and enforcement
 */
export class SubscriptionLimitsService extends ServiceBase {
  /**
   * Get user's current plan limits and usage
   */
  static async getUserLimits(
    context: "server" | "client" = "server",
  ): Promise<PlanLimits | null> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) return null;

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_user_plan_limits", {
          p_user_id: userId,
        });

        if (error) throw error;
        if (!data || data.length === 0) return null;

        const result = data[0];

        return {
          planName: result.plan_name,
          boardsLimit: result.boards_limit,
          emailSubscribersLimit: result.email_subscribers_limit,
          aiAnnouncementsLimit: result.ai_announcements_limit,
          boardsUsed: result.boards_used,
          emailSubscribersUsed: result.email_subscribers_used,
          aiAnnouncementsUsed: result.ai_announcements_used,
          customDomain: result.custom_domain,
          removeBranding: result.remove_branding,
          linearIntegration: result.linear_integration,
          advancedAnalytics: result.advanced_analytics,
          apiAccess: result.api_access,
          multipleTeamMembers: result.multiple_team_members,
          ssoSaml: result.sso_saml,
        };
      },
      {
        service: "SubscriptionLimitsService",
        method: "getUserLimits",
        userId,
      },
    );
  }

  /**
   * Check if user can perform action based on limit type
   * Returns true if user is under limit, false otherwise
   */
  static async checkLimit(
    limitType: LimitType,
    context: "server" | "client" = "server",
  ): Promise<boolean> {
    const limits = await this.getUserLimits(context);
    if (!limits) return false;

    const limitMap: Record<LimitType, { limit: number; used: number }> = {
      boards: { limit: limits.boardsLimit, used: limits.boardsUsed },
      email_subscribers: {
        limit: limits.emailSubscribersLimit,
        used: limits.emailSubscribersUsed,
      },
      ai_announcements: {
        limit: limits.aiAnnouncementsLimit,
        used: limits.aiAnnouncementsUsed,
      },
    };

    const { limit, used } = limitMap[limitType];

    // -1 means unlimited
    if (limit === -1) return true;

    return used < limit;
  }

  /**
   * Check if user has access to a feature
   */
  static async checkFeature(
    feature: FeatureType,
    context: "server" | "client" = "server",
  ): Promise<boolean> {
    const limits = await this.getUserLimits(context);
    if (!limits) return false;
    return limits[feature];
  }

  /**
   * Update usage counter (increment or decrement)
   */
  static async updateUsage(
    limitType: LimitType,
    operation: "increment" | "decrement",
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const functionName =
          operation === "increment"
            ? "increment_usage_counter"
            : "decrement_usage_counter";

        const { error } = await client.rpc(functionName, {
          p_user_id: userId,
          p_counter_type: limitType,
        });

        if (error) throw error;
      },
      {
        service: "SubscriptionLimitsService",
        method: "updateUsage",
        userId,
      },
    );
  }
}
