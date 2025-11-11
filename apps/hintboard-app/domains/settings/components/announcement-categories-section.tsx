import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
} from "@hintboard/ui/component";
import { AnnouncementsService } from "@hintboard/supabase/services";
import { AnnouncementCategoryItem } from "./announcement-category-item";
import { usePrimaryColor } from "@/shared/hooks/use-primary-color";

interface AnnouncementCategoriesSectionProps {
  organizationId: string;
}

export function AnnouncementCategoriesSection({
  organizationId,
}: AnnouncementCategoriesSectionProps) {
  const [categoryName, setCategoryName] = useState("");
  const primaryColor = usePrimaryColor();
  const [categoryColor, setCategoryColor] = useState(primaryColor);
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["announcement-categories", organizationId],
    queryFn: () => AnnouncementsService.getCategories(organizationId, "client"),
    enabled: !!organizationId,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      AnnouncementsService.createCategory(
        organizationId,
        data.name,
        data.color,
        "client",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcement-categories", organizationId],
      });
      setCategoryName("");
      setCategoryColor(primaryColor);
    },
  });

  // Reorder categories mutation
  const reorderCategoriesMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; sort_order: number }>) =>
      AnnouncementsService.reorderCategories(updates, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcement-categories", organizationId],
      });
    },
  });

  // Update color when primary color changes
  useEffect(() => {
    if (primaryColor) {
      setCategoryColor(primaryColor);
    }
  }, [primaryColor]);

  const handleAddCategory = () => {
    if (!categoryName.trim()) return;
    createCategoryMutation.mutate({
      name: categoryName.trim(),
      color: categoryColor,
    });
  };

  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    const newCategories = [...categories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newCategories.length) return;

    [newCategories[index], newCategories[targetIndex]] = [
      newCategories[targetIndex],
      newCategories[index],
    ];

    const updates = newCategories.map((category, idx) => ({
      id: category.id,
      sort_order: idx,
    }));

    reorderCategoriesMutation.mutate(updates);
  };

  const handleCategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddCategory();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcement Categories</CardTitle>
        <CardDescription>
          Create and manage categories for organizing announcements. Drag to
          reorder them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="category-name"
              placeholder="Category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyPress={handleCategoryKeyPress}
              disabled={createCategoryMutation.isPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={categoryColor}
              onChange={(e) => setCategoryColor(e.target.value)}
              className="h-10 w-16 rounded border border-border cursor-pointer"
              disabled={createCategoryMutation.isPending}
            />
            <Button
              onClick={handleAddCategory}
              disabled={
                !categoryName.trim() || createCategoryMutation.isPending
              }
              className="sm:w-auto"
            >
              Add Category
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-6">
          {categoriesLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No categories yet. Add your first category above.
            </div>
          ) : (
            categories.map((category, index) => (
              <AnnouncementCategoryItem
                key={category.id}
                category={category}
                organizationId={organizationId}
                onMoveUp={() => handleMoveCategory(index, "up")}
                onMoveDown={() => handleMoveCategory(index, "down")}
                isFirst={index === 0}
                isLast={index === categories.length - 1}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
