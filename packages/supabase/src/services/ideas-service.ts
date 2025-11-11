import { Database } from "src/lib/types";
import { AttachmentsService } from "./attachments-service";
import { ServiceBase } from "./base-service";

type IdeaData = Database["public"]["Tables"]["ideas"]["Row"];
export type IdeaWithUserInfo =
  Database["public"]["Functions"]["get_ideas_with_user_info"]["Returns"][number];

export interface AdminFilters {
  is_archived?: boolean;
  is_bug?: boolean;
  is_private?: boolean;
  is_unprioritized?: boolean;
  no_status?: boolean;
}

export class IdeasService extends ServiceBase {
  /**
   * Get filtered ideas using the database function
   */
  static async getFilteredIdeas(
    organizationId: string,
    statusId?: string | null,
    topicId?: string | null,
    context: "server" | "client" = "server",
    adminFilters?: AdminFilters,
  ): Promise<IdeaWithUserInfo[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_ideas_with_user_info", {
          p_org_id: organizationId,
          p_status_id: statusId || null,
          p_topic_id: topicId || null,
          p_is_archived: adminFilters?.is_archived ?? null,
          p_is_bug: adminFilters?.is_bug ?? null,
          p_is_private: adminFilters?.is_private ?? null,
          p_is_unprioritized: adminFilters?.is_unprioritized ?? null,
          p_no_status: adminFilters?.no_status ?? null,
        });

        if (error) throw error;

        return data || [];
      },
      {
        service: "IdeaService",
        method: "getFilteredIdeas",
      },
    );
  }

  /**
   * Create a new idea with attachments and automatically vote for it
   */
  static async createIdea(
    data: IdeaData & {
      topic_ids?: string[];
      user_id?: string;
      files?: File[];
      organizationSlug?: string;
    },
    context: "server" | "client" = "server",
  ): Promise<{ id: string }> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Use provided user_id if available (admin override)
        const ideaUserId = data.user_id || userId;

        // Create the idea
        const { data: idea, error } = await client
          .from("ideas")
          .insert({
            user_id: ideaUserId,
            organization_id: data.organization_id,
            title: data.title,
            description: data.description || null,
            is_private: data.is_private ?? false,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Assign topics if provided
        if (data.topic_ids && data.topic_ids.length > 0) {
          const topicMappings = data.topic_ids.map((topicId) => ({
            idea_id: idea.id,
            topic_id: topicId,
          }));

          const { error: topicError } = await client
            .from("idea_topic_map")
            .insert(topicMappings);

          if (topicError) throw topicError;
        }

        // Upload attachments if provided
        if (data.files && data.files.length > 0 && data.organizationSlug) {
          await Promise.all(
            data.files.map((file) =>
              AttachmentsService.uploadAttachment(
                data.organizationSlug!,
                data.organization_id!,
                file,
                { ideaId: idea.id },
                context,
              ),
            ),
          );
        }

        // Automatically add a vote from the creator
        const { error: voteError } = await client.from("idea_votes").insert({
          idea_id: idea.id,
          user_id: userId,
          value: 1,
        });

        if (voteError) {
          console.error("Error adding automatic vote:", voteError);
          // Don't throw error - idea is already created
        }

        return idea;
      },
      {
        service: "IdeaService",
        method: "createIdea",
      },
    );
  }

  /**
   * Get all ideas visible to the current user
   * used on my content section on settings
   */
  static async getVisibleIdeas(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<IdeaWithUserInfo[]> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_ideas_with_user_info", {
          p_org_id: organizationId,
        });

        if (error) throw error;

        return data || [];
      },
      {
        service: "IdeaService",
        method: "getVisibleIdeas",
      },
    );
  }

  /**
   * Update an idea (only by its creator)
   */
  static async updateIdea(
    ideaId: string,
    updates: Partial<Omit<IdeaData, "organization_id">>,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("ideas")
          .update({
            title: updates.title,
            description: updates.description,
            is_private: updates.is_private,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ideaId);

        if (error) throw error;
      },
      {
        service: "IdeaService",
        method: "updateIdea",
      },
    );
  }

  /**
   * Update idea admin flags
   */
  static async updateAdminFlags(
    ideaId: string,
    flags: {
      is_bug?: boolean;
      is_archived?: boolean;
      is_private?: boolean;
      is_unprioritized?: boolean;
      is_pinned?: boolean;
    },
    context: "server" | "client" = "client",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("ideas")
          .update({
            ...flags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ideaId);

        if (error) throw error;
      },
      {
        service: "IdeaService",
        method: "updateAdminFlags",
      },
    );
  }

  /**
   * Delete an idea (only by its creator)
   */
  static async deleteIdea(
    ideaId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client.from("ideas").delete().eq("id", ideaId);

        if (error) throw error;
      },
      {
        service: "IdeaService",
        method: "deleteIdea",
      },
    );
  }

  /**
   * Cast or update a vote for an idea
   */
  static async voteIdea(
    ideaId: string,
    value: number,
    context: "server" | "client" = "server",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);

    if (value < 0) throw new Error("Vote value cannot be negative");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data: existing, error: fetchError } = await client
          .from("idea_votes")
          .select("*")
          .eq("idea_id", ideaId)
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          const { error: updateError } = await client
            .from("idea_votes")
            .update({ value })
            .eq("idea_id", ideaId)
            .eq("user_id", userId);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await client
            .from("idea_votes")
            .insert({
              idea_id: ideaId,
              user_id: userId,
              value,
            });
          if (insertError) throw insertError;
        }
      },
      {
        service: "IdeaService",
        method: "voteIdea",
      },
    );
  }

  /**
   * Get total votes for an idea
   */
  static async getIdeaVotes(
    ideaId: string,
    context: "server" | "client" = "server",
  ): Promise<number> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("idea_votes")
          .select("value")
          .eq("idea_id", ideaId);

        if (error) throw error;

        return (data || []).reduce((sum, vote) => sum + vote.value, 0);
      },
      {
        service: "IdeaService",
        method: "getIdeaVotes",
      },
    );
  }
}
