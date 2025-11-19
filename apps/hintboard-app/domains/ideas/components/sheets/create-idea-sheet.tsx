"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Button,
} from "@hintboard/ui/component";
import { IdeasService, UserService } from "@hintboard/supabase/services";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { IdeaForm, IdeaFormData } from "../forms/idea-form";
import { Send } from "lucide-react";

interface CreateIdeaSheetProps {
  organizationId: string | undefined;
}

export const CreateIdeaSheet: React.FC<CreateIdeaSheetProps> = ({
  organizationId,
}) => {
  const router = useRouter();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<IdeaFormData>({
    title: "",
    description: "",
    isPrivate: false,
    selectedTopics: [],
    selectedUserId: null,
    attachedFiles: [],
  });
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof UserService.getUserInfo>
  > | null>(null);

  React.useEffect(() => {
    const loadUser = async () => {
      const info = await UserService.getUserInfo("client");
      setUser(info);
    };
    loadUser();
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      setFormData((prev) => ({
        ...prev,
        selectedUserId: prev.selectedUserId || user.id,
      }));
    }
  }, [user?.id]);

  const userRole = organization?.role || "guest";
  const isGuest = userRole === "guest";
  const isAdmin = userRole === "admin";

  const resetForm = () => {
    // Cleanup preview URLs
    formData.attachedFiles.forEach((filePreview) => {
      if (filePreview.preview) {
        URL.revokeObjectURL(filePreview.preview);
      }
    });

    setFormData({
      title: "",
      description: "",
      isPrivate: false,
      selectedTopics: [],
      selectedUserId: null,
      attachedFiles: [],
    });
  };

  const handleFormDataChange = (data: Partial<IdeaFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return toast.error("Title is required");
    }

    if (!organization?.slug || !organizationId) {
      return toast.error("Organization information missing");
    }

    setLoading(true);
    try {
      await IdeasService.createIdea(
        {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          organization_id: organizationId,
          is_private: isGuest ? false : formData.isPrivate,
          topic_ids:
            formData.selectedTopics.length > 0
              ? formData.selectedTopics
              : undefined,
          user_id: isAdmin ? formData.selectedUserId : undefined,
          files:
            formData.attachedFiles.length > 0
              ? formData.attachedFiles.map((fp) => fp.file)
              : undefined,
          organizationSlug: organization.slug,
        },
        "client",
      );

      queryClient.invalidateQueries({
        queryKey: ["filtered-ideas", organizationId],
      });

      toast.success("Idea created successfully!");
      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error creating idea:", error);
      toast.error(error.message || "Failed to create idea.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Send />
          Submit an Idea
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="text-2xl font-semibold">
              Tell us your Idea!
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 px-6 pb-6">
            <IdeaForm
              organizationId={organizationId || ""}
              organizationSlug={organization?.slug || ""}
              userRole={userRole}
              loading={loading}
              formData={formData}
              onFormDataChange={handleFormDataChange}
              onSubmit={handleSubmit}
              submitButtonText="Submit Idea"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
