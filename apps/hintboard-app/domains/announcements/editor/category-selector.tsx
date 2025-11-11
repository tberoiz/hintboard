"use client";

import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hintboard/ui/component";
import { Tag, X, Check } from "lucide-react";
import { Category } from "../types";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
  onManageCategories: () => void;
}

export function CategorySelector({
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onManageCategories,
}: CategorySelectorProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2 items-center">
        {selectedCategoryIds.map((id) => {
          const category = categories.find((c) => c.id === id);
          if (!category) return null;
          return (
            <Badge
              key={id}
              variant="outline"
              className="gap-1.5 pr-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: `${category.color}15`,
                borderColor: `${category.color}40`,
                color: category.color,
              }}
              onClick={() => onToggleCategory(id)}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <X className="w-3 h-3 ml-0.5" />
            </Badge>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Tag className="w-3 h-3" />
              Add category
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {categories.length === 0 ? (
              <div className="px-2 py-6 text-sm text-center text-muted-foreground">
                No categories available
              </div>
            ) : (
              categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => onToggleCategory(category.id)}
                  className="gap-3 cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1">{category.name}</span>
                  {selectedCategoryIds.includes(category.id) && (
                    <Check className="w-4 h-4 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onManageCategories}
              className="cursor-pointer text-muted-foreground"
            >
              Manage categories
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
