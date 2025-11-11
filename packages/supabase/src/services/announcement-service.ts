import { ServiceBase } from "./base-service";
import { Database } from "src/lib/types";

type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
type AnnouncementInsert =
  Database["public"]["Tables"]["announcements"]["Insert"];
type AnnouncementUpdate =
  Database["public"]["Tables"]["announcements"]["Update"];

type CategoryRow =
  Database["public"]["Tables"]["announcement_categories"]["Row"];
type CategoryInsert =
  Database["public"]["Tables"]["announcement_categories"]["Insert"];

export interface AnnouncementWithDetails {
  id: string;
  title: string;
  content: any;
  status: "draft" | "published";
  published_at: string | null;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_avatar: string;
  categories: Array<{ id: string; name: string; color: string }>;
  reaction_count: number;
  my_reaction: string | null;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  announcement_count: number;
}

export class AnnouncementsService extends ServiceBase {
  /**
   * Get announcements with full details
   */
  static async getAnnouncementsWithDetails(
    organizationId: string,
    options?: {
      status?: "draft" | "published";
      categoryId?: string;
    },
    context: "server" | "client" = "server",
  ): Promise<AnnouncementWithDetails[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc(
          "get_announcements_with_details",
          {
            p_org_id: organizationId,
            p_status: options?.status || null,
            p_category_id: options?.categoryId || null,
          },
        );

        if (error) throw error;
        return data || [];
      },
      {
        service: "AnnouncementsService",
        method: "getAnnouncementsWithDetails",
      },
    );
  }

  /**
   * Get a single announcement by ID
   */
  static async getAnnouncement(
    announcementId: string,
    context: "server" | "client" = "server",
  ): Promise<AnnouncementRow | null> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("announcements")
          .select("*")
          .eq("id", announcementId)
          .single();

        if (error) throw error;
        return data;
      },
      { service: "AnnouncementsService", method: "getAnnouncement" },
    );
  }

  /**
   * Create a new announcement
   */
  static async createAnnouncement(
    data: {
      organization_id: string;
      title: string;
      content?: any;
      status?: "draft" | "published";
      categoryIds?: string[];
    },
    context: "server" | "client" = "server",
  ): Promise<{ id: string }> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data: announcement, error } = await client
          .from("announcements")
          .insert({
            organization_id: data.organization_id,
            user_id: userId,
            title: data.title,
            content: data.content || {},
            status: data.status || "draft",
            published_at:
              data.status === "published" ? new Date().toISOString() : null,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Add categories if provided
        if (data.categoryIds && data.categoryIds.length > 0) {
          await this.updateAnnouncementCategories(
            announcement.id,
            data.categoryIds,
            context,
          );
        }

        return announcement;
      },
      { service: "AnnouncementsService", method: "createAnnouncement" },
    );
  }

  /**
   * Update an announcement
   */
  static async updateAnnouncement(
    announcementId: string,
    updates: {
      title?: string;
      content?: any;
      status?: "draft" | "published";
      is_pinned?: boolean;
      categoryIds?: string[];
    },
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.status !== undefined) {
          updateData.status = updates.status;
          if (updates.status === "published") {
            // Get current announcement to check if already published
            const { data: current } = await client
              .from("announcements")
              .select("published_at")
              .eq("id", announcementId)
              .single();

            if (!current?.published_at) {
              updateData.published_at = new Date().toISOString();
            }
          }
        }
        if (updates.is_pinned !== undefined)
          updateData.is_pinned = updates.is_pinned;

        if (Object.keys(updateData).length > 0) {
          const { error } = await client
            .from("announcements")
            .update(updateData)
            .eq("id", announcementId);

          if (error) throw error;
        }

        // Update categories if provided
        if (updates.categoryIds !== undefined) {
          await this.updateAnnouncementCategories(
            announcementId,
            updates.categoryIds,
            context,
          );
        }
      },
      { service: "AnnouncementsService", method: "updateAnnouncement" },
    );
  }

  /**
   * Delete an announcement
   */
  static async deleteAnnouncement(
    announcementId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("announcements")
          .delete()
          .eq("id", announcementId);

        if (error) throw error;
      },
      { service: "AnnouncementsService", method: "deleteAnnouncement" },
    );
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(
    announcementId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client.rpc("increment_announcement_views", {
          p_announcement_id: announcementId,
        });

        if (error) throw error;
      },
      { service: "AnnouncementsService", method: "incrementViewCount" },
    );
  }

  /**
   * Toggle reaction on announcement
   */
  static async toggleReaction(
    announcementId: string,
    emoji: string = "👍",
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Check if reaction exists
        const { data: existing } = await client
          .from("announcement_reactions")
          .select("id")
          .eq("announcement_id", announcementId)
          .maybeSingle();

        if (existing) {
          // Remove reaction
          const { error } = await client
            .from("announcement_reactions")
            .delete()
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          // Add reaction
          const { error } = await client.from("announcement_reactions").insert({
            announcement_id: announcementId,
            emoji,
          });

          if (error) throw error;
        }
      },
      { service: "AnnouncementsService", method: "toggleReaction" },
    );
  }

  /**
   * Update announcement categories
   */
  private static async updateAnnouncementCategories(
    announcementId: string,
    categoryIds: string[],
    context: "server" | "client" = "server",
  ): Promise<void> {
    const client = await this.getClient(context);

    // Remove existing categories
    await client
      .from("announcement_category_map")
      .delete()
      .eq("announcement_id", announcementId);

    // Add new categories
    if (categoryIds.length > 0) {
      const mappings = categoryIds.map((categoryId) => ({
        announcement_id: announcementId,
        category_id: categoryId,
      }));

      const { error } = await client
        .from("announcement_category_map")
        .insert(mappings);

      if (error) throw error;
    }
  }

  // ============ CATEGORIES ============

  /**
   * Get categories with announcement counts
   */
  static async getCategoriesWithCounts(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<CategoryWithCount[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client.rpc(
          "get_announcement_categories_with_counts",
          {
            p_org_id: organizationId,
          },
        );

        if (error) throw error;
        return data || [];
      },
      {
        service: "AnnouncementsService",
        method: "getCategoriesWithCounts",
      },
    );
  }

  /**
   * Get all categories for an organization
   */
  static async getCategories(
    organizationId: string,
    context: "server" | "client" = "server",
  ): Promise<CategoryRow[]> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { data, error } = await client
          .from("announcement_categories")
          .select("*")
          .eq("organization_id", organizationId)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        return data || [];
      },
      { service: "AnnouncementsService", method: "getCategories" },
    );
  }

  /**
   * Create a new category
   */
  static async createCategory(
    organizationId: string,
    name: string,
    color: string = "#3b82f6",
    context: "server" | "client" = "server",
  ): Promise<{ id: string }> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Get the highest sort_order
        const { data: categories } = await client
          .from("announcement_categories")
          .select("sort_order")
          .eq("organization_id", organizationId)
          .order("sort_order", { ascending: false })
          .limit(1);

        const maxSortOrder = categories?.[0]?.sort_order ?? -1;

        const { data, error } = await client
          .from("announcement_categories")
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
      { service: "AnnouncementsService", method: "createCategory" },
    );
  }

  /**
   * Update a category
   */
  static async updateCategory(
    categoryId: string,
    updates: { name?: string; color?: string },
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("announcement_categories")
          .update(updates)
          .eq("id", categoryId);

        if (error) throw error;
      },
      { service: "AnnouncementsService", method: "updateCategory" },
    );
  }

  /**
   * Delete a category
   */
  static async deleteCategory(
    categoryId: string,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const { error } = await client
          .from("announcement_categories")
          .delete()
          .eq("id", categoryId);

        if (error) throw error;
      },
      { service: "AnnouncementsService", method: "deleteCategory" },
    );
  }

  /**
   * Reorder categories
   */
  static async reorderCategories(
    updates: Array<{ id: string; sort_order: number }>,
    context: "server" | "client" = "server",
  ): Promise<void> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);

        const promises = updates.map(({ id, sort_order }) =>
          client
            .from("announcement_categories")
            .update({ sort_order })
            .eq("id", id),
        );

        const results = await Promise.all(promises);

        const error = results.find((r) => r.error)?.error;
        if (error) throw error;
      },
      { service: "AnnouncementsService", method: "reorderCategories" },
    );
  }
}
