import { ServiceBase } from "./base-service";
import { Database } from "src/lib/types";

export type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];

export interface AttachmentMetadata {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

export class AttachmentsService extends ServiceBase {
  /**
   * Upload a file and create attachment record
   * Works for both ideas and comments
   */
  static async uploadAttachment(
    organizationSlug: string,
    organizationId: string,
    file: File,
    target: { ideaId?: string; commentId?: string },
    context: "server" | "client" = "client",
  ): Promise<AttachmentMetadata> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    // Validate target
    if (!target.ideaId && !target.commentId) {
      throw new Error("Must specify either ideaId or commentId");
    }
    if (target.ideaId && target.commentId) {
      throw new Error("Cannot attach to both idea and comment");
    }

    return this.execute(
      async () => {
        const client = await this.getClient(context);

        // Generate file path based on target type
        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const targetType = target.ideaId ? "ideas" : "comments";
        const targetId = target.ideaId || target.commentId;
        const filePath = `${targetType}/${targetId}/${userId}/${timestamp}_${sanitizedFilename}`;
        const bucketName = `org-${organizationSlug}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await client.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Create attachment record
        const { data: attachment, error: dbError } = await client
          .from("attachments")
          .insert({
            organization_id: organizationId,
            idea_id: target.ideaId || null,
            comment_id: target.commentId || null,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: userId,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        return {
          id: attachment.id,
          file_name: attachment.file_name,
          file_path: attachment.file_path,
          file_size: attachment.file_size,
          file_type: attachment.file_type,
          uploaded_by: attachment.uploaded_by,
          created_at: attachment.created_at,
        };
      },
      {
        service: "AttachmentsService",
        method: "uploadAttachment",
        userId,
      },
    );
  }

  /**
   * Delete an attachment (storage + database)
   */
  static async deleteAttachment(
    organizationSlug: string,
    attachmentId: string,
    context: "server" | "client" = "client",
  ): Promise<void> {
    const userId = await this.getCurrentUserId(context);
    if (!userId) throw new Error("User not authenticated");

    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const bucketName = `org-${organizationSlug}`;

        // Get attachment info
        const { data: attachment, error: fetchError } = await client
          .from("attachments")
          .select("file_path, uploaded_by")
          .eq("id", attachmentId)
          .single();

        if (fetchError) throw fetchError;

        // Verify ownership
        if (attachment.uploaded_by !== userId) {
          throw new Error("Not authorized to delete this attachment");
        }

        // Delete from storage
        const { error: storageError } = await client.storage
          .from(bucketName)
          .remove([attachment.file_path]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await client
          .from("attachments")
          .delete()
          .eq("id", attachmentId)
          .eq("uploaded_by", userId);

        if (dbError) throw dbError;
      },
      {
        service: "AttachmentsService",
        method: "deleteAttachment",
        userId,
      },
    );
  }

  /**
   * Get a URL for an attachment. Uses signed URL so it works with private buckets.
   */
  static async getAttachmentUrl(
    organizationSlug: string,
    filePath: string,
    context: "server" | "client" = "client",
  ): Promise<string> {
    return this.execute(
      async () => {
        const client = await this.getClient(context);
        const bucketName = `org-${organizationSlug}`;

        // Prefer signed URLs to support private buckets reliably
        const { data, error } = await client.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        if (error) throw error;
        return data.signedUrl;
      },
      {
        service: "AttachmentsService",
        method: "getAttachmentUrl",
      },
    );
  }
}
