import { ServiceBase } from "./base-service";
import { IdeaWithUserInfo } from "./ideas-service";

export interface RoadmapColumn {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  ideas: IdeaWithUserInfo[];
}

export interface RoadmapData {
  columns: RoadmapColumn[];
  noStatusIdeas: IdeaWithUserInfo[];
}

export class RoadmapService extends ServiceBase {
  /**
   * Get ideas organized by status for roadmap view
   */
  static async getRoadmapData(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<RoadmapData> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Get all statuses with their ideas
        const { data: statuses, error: statusError } = await client.rpc(
          "get_statuses_with_counts",
          { p_org_id: organizationId },
        );

        if (statusError) throw statusError;

        // Get all non-archived ideas for this organization
        const { data: allIdeas, error: ideasError } = await client.rpc(
          "get_ideas_with_user_info",
          {
            p_org_id: organizationId,
            p_is_archived: false, // Don't show archived ideas in roadmap
          },
        );

        if (ideasError) throw ideasError;

        // Group ideas by status
        const columns: RoadmapColumn[] = (statuses || []).map(
          (status: any) => ({
            id: status.id,
            name: status.name,
            sort_order: status.sort_order,
            ideas: (allIdeas || []).filter(
              (idea: any) => idea.status_id === status.id,
            ),
          }),
        );

        // Get ideas without status
        const noStatusIdeas = (allIdeas || []).filter(
          (idea: any) => idea.status_id === null,
        );

        return {
          columns: columns.sort((a, b) => a.sort_order - b.sort_order),
          noStatusIdeas,
        };
      },
      {
        service: "RoadmapService",
        method: "getRoadmapData",
      },
    );
  }

  /**
   * Update idea status (for drag-and-drop)
   * Only members, admins, and owners can update status
   */
  static async updateIdeaStatus(
    ideaId: string,
    statusId: string | null,
    context: "server" | "client" = "client",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("ideas")
          .update({
            status_id: statusId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ideaId);

        if (error) throw error;
      },
      {
        service: "RoadmapService",
        method: "updateIdeaStatus",
      },
    );
  }

  /**
   * Check if user can modify roadmap (drag ideas)
   * Guests cannot modify, only view
   */
  static canModifyRoadmap(userRole?: string): boolean {
    if (!userRole) return false;
    return ["admin", "moderator"].includes(userRole);
  }
}
