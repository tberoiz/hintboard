import { ServiceBase } from "./base-service";

export type ActivityType =
  | "idea_created"
  | "idea_updated"
  | "idea_deleted"
  | "idea_status_changed"
  | "idea_marked_bug"
  | "idea_unmarked_bug"
  | "idea_archived"
  | "idea_unarchived"
  | "idea_pinned"
  | "idea_unpinned"
  | "idea_made_private"
  | "idea_made_public"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted"
  | "vote_added"
  | "vote_removed"
  | "topic_added"
  | "topic_removed"
  | "attachment_added"
  | "attachment_deleted";

export interface IdeaActivity {
  id: string;
  activity_type: ActivityType;
  metadata: Record<string, any>;
  created_at: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_avatar: string;
}

export class ActivitiesService extends ServiceBase {
  /**
   * Get all activities for an idea
   */
  static async getIdeaActivities(
    ideaId: string,
    context: "server" | "client" = "client",
  ): Promise<IdeaActivity[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_idea_activities", {
          p_idea_id: ideaId,
        });

        if (error) throw error;

        return (data || []) as IdeaActivity[];
      },
      {
        service: "ActivitiesService",
        method: "getIdeaActivities",
      },
    );
  }

  /**
   * Manually log an activity (for activities not covered by triggers)
   */
  static async logActivity(
    ideaId: string,
    activityType: ActivityType,
    metadata: Record<string, any> = {},
    context: "server" | "client" = "client",
  ): Promise<string> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("log_idea_activity", {
          p_idea_id: ideaId,
          p_user_id: userId,
          p_activity_type: activityType,
          p_metadata: metadata,
        });

        if (error) throw error;

        return data as string;
      },
      {
        service: "ActivitiesService",
        method: "logActivity",
      },
    );
  }

  /**
   * Subscribe to real-time activity updates for an idea
   */
  static subscribeToIdeaActivities(
    ideaId: string,
    callback: (activity: IdeaActivity) => void,
    context: "server" | "client" = "client",
  ) {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const subscription = client
          .channel(`idea_activities:${ideaId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "idea_activities",
              filter: `idea_id=eq.${ideaId}`,
            },
            async (payload) => {
              // Fetch the full activity with user info
              const { data } = await client.rpc("get_idea_activities", {
                p_idea_id: ideaId,
              });

              const newActivity = (data || []).find(
                (a: IdeaActivity) => a.id === payload.new.id,
              );

              if (newActivity) {
                callback(newActivity);
              }
            },
          )
          .subscribe();

        return subscription;
      },
      {
        service: "ActivitiesService",
        method: "subscribeToIdeaActivities",
      },
    );
  }

  /**
   * Format activity for display
   */
  static formatActivityMessage(activity: IdeaActivity): string {
    const userName = activity.user_name || activity.user_email;

    switch (activity.activity_type) {
      case "idea_created":
        return `created this idea`;

      case "idea_status_changed":
        const oldStatus = activity.metadata.old_status || "None";
        const newStatus = activity.metadata.new_status || "None";
        return `changed status from "${oldStatus}" to "${newStatus}"`;

      case "idea_marked_bug":
        return `marked this idea as a bug`;

      case "idea_unmarked_bug":
        return `unmarked this idea as a bug`;

      case "idea_archived":
        return `archived this idea`;

      case "idea_unarchived":
        return `unarchived this idea`;

      case "idea_pinned":
        return `pinned this idea`;

      case "idea_unpinned":
        return `unpinned this idea`;

      case "idea_made_private":
        return `made this idea private`;

      case "idea_made_public":
        return `made this idea public`;

      case "comment_added":
        return `added a comment`;

      case "comment_updated":
        return `updated a comment`;

      case "comment_deleted":
        return `deleted a comment`;

      case "vote_added":
        return `voted on this idea`;

      case "vote_removed":
        return `removed their vote`;

      case "topic_added":
        return `added topic "${activity.metadata.topic_name}"`;

      case "topic_removed":
        return `removed topic "${activity.metadata.topic_name}"`;

      case "attachment_added":
        return `added attachment "${activity.metadata.file_name}"`;

      case "attachment_deleted":
        return `deleted attachment "${activity.metadata.file_name}"`;

      default:
        return `performed an action`;
    }
  }

  /**
   * Get activity icon based on type
   */
  static getActivityIcon(activityType: ActivityType): string {
    const iconMap: Record<ActivityType, string> = {
      idea_created: "✨",
      idea_updated: "📝",
      idea_deleted: "🗑️",
      idea_status_changed: "🔄",
      idea_marked_bug: "🐛",
      idea_unmarked_bug: "✓",
      idea_archived: "📦",
      idea_unarchived: "📤",
      idea_pinned: "📌",
      idea_unpinned: "📍",
      idea_made_private: "🔒",
      idea_made_public: "🔓",
      comment_added: "💬",
      comment_updated: "✏️",
      comment_deleted: "🗑️",
      vote_added: "👍",
      vote_removed: "👎",
      topic_added: "🏷️",
      topic_removed: "🏷️",
      attachment_added: "📎",
      attachment_deleted: "🗑️",
    };

    return iconMap[activityType] || "•";
  }
}
