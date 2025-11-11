import { ServiceBase } from "./base-service";
import { Database } from "src/lib/types";
import { OrganizationService } from "./organization-service";

export type TopicRow = Database["public"]["Tables"]["user_idea_topics"]["Row"];
type TopicInsert = Database["public"]["Tables"]["user_idea_topics"]["Insert"];

export class TopicsService extends ServiceBase {
  /**
   * Get all topics for an organization
   */
  static async getTopics(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<TopicRow[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("user_idea_topics")
          .select("*")
          .eq("organization_id", organizationId)
          .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
      },
      { service: "TopicsService", method: "getTopics" },
    );
  }

  /**
   * Create a new topic (per-organization namespace, case-insensitive)
   */
  static async createTopic(
    organizationId: string,
    name: string,
    context: "server" | "client" = "server",
  ): Promise<{ id: string }> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("user_idea_topics")
          .insert({
            organization_id: organizationId,
            name,
          })
          .select("id")
          .single();

        if (error) throw error;
        return data;
      },
      { service: "TopicsService", method: "createTopic" },
    );
  }

  /**
   * Delete a topic (also removes mappings via cascade)
   */
  static async deleteTopic(
    topicId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("user_idea_topics")
          .delete()
          .eq("id", topicId);

        if (error) throw error;
      },
      { service: "TopicsService", method: "deleteTopic" },
    );
  }

  // ============================================================
  //  IDEA <-> TOPIC MAPPING
  // ============================================================

  /**
   * Assign a topic to an idea
   */
  static async assignTopicToIdea(
    ideaId: string,
    topicId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("idea_topic_map")
          .insert({ idea_id: ideaId, topic_id: topicId });

        if (error && error.code !== "23505") throw error; // ignore unique violation
      },
      { service: "TopicsService", method: "assignTopicToIdea" },
    );
  }

  /**
   * Get topics with idea counts for an organization
   */
  static async getTopicsWithCounts(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<Array<{ id: string; name: string; idea_count: number }>> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_topics_with_counts", {
          p_org_id: organizationId,
        });

        if (error) throw error;
        return data || [];
      },
      { service: "TopicsService", method: "getTopicsWithCounts" },
    );
  }

  /**
   * Remove a topic from an idea
   */
  static async removeTopicFromIdea(
    ideaId: string,
    topicId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("idea_topic_map")
          .delete()
          .eq("idea_id", ideaId)
          .eq("topic_id", topicId);

        if (error) throw error;
      },
      { service: "TopicsService", method: "removeTopicFromIdea" },
    );
  }

  /**
   * Get all topics assigned to a specific idea
   */
  static async getTopicsForIdea(
    ideaId: string,
    context: "server" | "client" = "server",
  ): Promise<TopicRow[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("idea_topic_map")
          .select(
            `
               user_idea_topics!inner (
                 id,
                 name,
                 organization_id,
                 created_at
               )
             `,
          )
          .eq("idea_id", ideaId)
          .returns<{ user_idea_topics: TopicRow }[]>();

        if (error) throw error;

        return data.map((row) => row.user_idea_topics);
      },
      { service: "TopicsService", method: "getTopicsForIdea" },
    );
  }

  /**
   * Get all ideas under a given topic
   */
  static async getIdeasForTopic(
    topicId: string,
    context: "server" | "client" = "server",
  ): Promise<Array<{ idea_id: string }>> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("idea_topic_map")
          .select("idea_id")
          .eq("topic_id", topicId);

        if (error) throw error;
        return data || [];
      },
      { service: "TopicsService", method: "getIdeasForTopic" },
    );
  }
}
