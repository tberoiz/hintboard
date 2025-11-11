import { ServiceBase } from "./base-service";
import { Database } from "src/lib/types";

type StatusRow = Database["public"]["Tables"]["idea_statuses"]["Row"];
type StatusInsert = Database["public"]["Tables"]["idea_statuses"]["Insert"];
type StatusUpdate = Database["public"]["Tables"]["idea_statuses"]["Update"];

export class StatusesService extends ServiceBase {
  /**
   * Get statuses with idea counts for an organization
   */
  static async getStatusesWithCounts(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<
    Array<{
      id: string;
      name: string;
      color: string;
      sort_order: number;
      idea_count: number;
    }>
  > {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc("get_statuses_with_counts", {
          p_org_id: organizationId,
        });

        if (error) throw error;
        return data || [];
      },
      { service: "StatusesService", method: "getStatusesWithCounts" },
    );
  }

  /**
   * Get all statuses for an organization (ordered by sort_order)
   */
  static async getStatuses(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<StatusRow[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("idea_statuses")
          .select("*")
          .eq("organization_id", organizationId)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        return data || [];
      },
      { service: "StatusesService", method: "getStatuses" },
    );
  }

  /**
   * Create a new status
   */
  static async createStatus(
    organizationId: string,
    name: string,
    color: string,
    context: "server" | "client" = "server",
  ): Promise<{ id: string }> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Get the highest sort_order to append at the end
        const { data: statuses } = await client
          .from("idea_statuses")
          .select("sort_order")
          .eq("organization_id", organizationId)
          .order("sort_order", { ascending: false })
          .limit(1);

        const maxSortOrder = statuses?.[0]?.sort_order ?? -1;

        const { data, error } = await client
          .from("idea_statuses")
          .insert({
            organization_id: organizationId,
            name,
            color,
            sort_order: maxSortOrder + 1,
          })
          .select("id")
          .single();

        if (error) throw error;
        return data;
      },
      { service: "StatusesService", method: "createStatus" },
    );
  }

  /**
   * Update a status
   */
  static async updateStatus(
    statusId: string,
    updates: { name?: string; color?: string },
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("idea_statuses")
          .update(updates)
          .eq("id", statusId);

        if (error) throw error;
      },
      { service: "StatusesService", method: "updateStatus" },
    );
  }

  /**
   * Delete a status
   */
  static async deleteStatus(
    statusId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("idea_statuses")
          .delete()
          .eq("id", statusId);

        if (error) throw error;
      },
      { service: "StatusesService", method: "deleteStatus" },
    );
  }

  /**
   * Reorder statuses
   */
  static async reorderStatuses(
    updates: Array<{ id: string; sort_order: number }>,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Update each status with its new sort_order
        const promises = updates.map(({ id, sort_order }) =>
          client.from("idea_statuses").update({ sort_order }).eq("id", id),
        );

        const results = await Promise.all(promises);

        // Check if any update failed
        const error = results.find((r) => r.error)?.error;
        if (error) throw error;
      },
      { service: "StatusesService", method: "reorderStatuses" },
    );
  }
}
