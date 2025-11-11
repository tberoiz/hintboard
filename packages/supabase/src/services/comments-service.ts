import { ServiceBase } from "./base-service";
import { Database } from "src/lib/types";
import { AttachmentsService } from "./attachments-service";

export type CommentWithUserInfo =
  Database["public"]["Functions"]["get_idea_comments"]["Returns"][number];

export type CommentReaction = {
  emoji: string;
  user_id: string;
  created_at: string;
};

export class CommentsService extends ServiceBase {
  /**
   * Get all comments for an idea
   */
  static async getIdeaComments(
    ideaId: string,
    context: "server" | "client" = "server",
  ): Promise<CommentWithUserInfo[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_idea_comments", {
          p_idea_id: ideaId,
        });

        if (error) throw error;

        return data || [];
      },
      {
        service: "CommentsService",
        method: "getIdeaComments",
      },
    );
  }

  /**
   * Create a new comment (optionally with attachments)
   */
  static async createComment(
    data: {
      ideaId: string;
      content: string;
      parentId?: string | null;
      isPrivate?: boolean;
      files?: File[];
      organizationSlug?: string;
      organizationId?: string;
    },
    context: "server" | "client" = "server",
  ): Promise<{ id: string }> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data: comment, error } = await client
          .from("idea_comments")
          .insert({
            idea_id: data.ideaId,
            user_id: userId,
            parent_id: data.parentId || null,
            content: data.content,
            is_private: data.isPrivate || false,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Upload attachments if provided
        if (
          data.files &&
          data.files.length > 0 &&
          data.organizationSlug &&
          data.organizationId
        ) {
          await Promise.all(
            data.files.map((file) =>
              AttachmentsService.uploadAttachment(
                data.organizationSlug!,
                data.organizationId!,
                file,
                { commentId: comment.id },
                context,
              ),
            ),
          );
        }

        return comment;
      },
      {
        service: "CommentsService",
        method: "createComment",
      },
    );
  }

  /**
   * Update a comment
   */
  static async updateComment(
    commentId: string,
    content: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("idea_comments")
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commentId)
          .eq("user_id", userId);

        if (error) throw error;
      },
      {
        service: "CommentsService",
        method: "updateComment",
      },
    );
  }

  /**
   * Delete a comment (user can delete own, admin/moderator can delete any)
   */
  static async deleteComment(
    commentId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // RLS will handle the permission check
        // User can delete their own comments, admins can delete any
        const { error } = await client
          .from("idea_comments")
          .delete()
          .eq("id", commentId);

        if (error) throw error;
      },
      {
        service: "CommentsService",
        method: "deleteComment",
      },
    );
  }

  /**
   * Add or toggle a reaction to a comment
   */
  static async toggleReaction(
    commentId: string,
    emoji: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Check if reaction exists
        const { data: existing, error: fetchError } = await client
          .from("comment_reactions")
          .select("*")
          .eq("comment_id", commentId)
          .eq("user_id", userId)
          .eq("emoji", emoji)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          // Remove reaction
          const { error: deleteError } = await client
            .from("comment_reactions")
            .delete()
            .eq("id", existing.id);

          if (deleteError) throw deleteError;
        } else {
          // Add reaction
          const { error: insertError } = await client
            .from("comment_reactions")
            .insert({
              comment_id: commentId,
              user_id: userId,
              emoji,
            });

          if (insertError) throw insertError;
        }
      },
      {
        service: "CommentsService",
        method: "toggleReaction",
      },
    );
  }

  /**
   * Subscribe to comments for an idea (real-time)
   */
  static subscribeToComments(
    ideaId: string,
    onUpdate: () => void,
    context: "client",
  ) {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const channel = client
          .channel(`idea-comments:${ideaId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "idea_comments",
              filter: `idea_id=eq.${ideaId}`,
            },
            () => {
              console.log("Comment change detected");
              onUpdate(); // This should trigger the update function
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "comment_reactions",
              filter: `comment_id=eq.${ideaId}`, // If you want to listen to reactions for a specific idea
            },
            () => {
              console.log("Reaction change detected");
              onUpdate(); // This should trigger the update function
            },
          )
          .subscribe();

        return channel;
      },
      {
        service: "CommentsService",
        method: "subscribeToComments",
      },
    );
  }
}
