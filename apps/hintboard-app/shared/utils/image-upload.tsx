"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { UserService } from "@hintboard/supabase/services";
import { Button, Input, Card, CardContent } from "@hintboard/ui/component";
import { cn } from "@hintboard/ui/utils";
import { ImageIcon, X, Plus } from "lucide-react";
import { toast } from "sonner";
// Add a size type
type ImageDisplaySize = "sm" | "md" | "lg" | "xl";

interface BaseImageUploadProps {
  bucketName: string;
  targetSize?: number; // in bytes
  maxDimension?: number;
  className?: string;
  imageClassName?: string;
  displaySize?: ImageDisplaySize; // New size prop
}

interface SingleImageUploadProps extends BaseImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  multiple?: false;
  onFileSelect?: (file: File | null) => void;
}

interface MultipleImageUploadProps extends BaseImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple: true;
  maxImages?: number;
  onFileSelect?: (files: File[]) => void;
}

type ImageUploadProps = SingleImageUploadProps | MultipleImageUploadProps;

export async function removeImageFromStorage(
  imageUrl: string,
  bucketName: string,
) {
  try {
    // TODO: Implement image removal using UserService
    // For now, we'll just log the action
    console.log("Removing image from storage:", imageUrl, bucketName);

    // Extract the path from the URL
    const url = new URL(imageUrl);
    const path = url.pathname.split("/").pop();

    if (path) {
      console.log("Image path to remove:", path);
      // TODO: Implement actual removal logic
    }
  } catch (error) {
    console.error("Error removing image:", error);
    throw error;
  }
}

export function ImageUpload(props: ImageUploadProps) {
  const {
    bucketName,
    className,
    imageClassName,
    multiple = false,
    onFileSelect,
    displaySize = "xl", // Default to 'xl'
  } = props;

  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  // Memoize size classes based on displaySize prop
  const sizeClasses = useMemo(() => {
    switch (displaySize) {
      case "sm":
        return {
          container: "max-w-[80px] aspect-square",
          imagePadding: "p-1",
          placeholderIcon: "h-6 w-6",
          placeholderText: "text-xs",
        };
      case "md":
        return {
          container: "max-w-[160px] aspect-square",
          imagePadding: "p-2",
          placeholderIcon: "h-8 w-8",
          placeholderText: "text-sm",
        };
      case "lg":
        return {
          container: "w-full h-full aspect-[3/4]",
          imagePadding: "p-0",
          placeholderIcon: "h-10 w-10",
          placeholderText: "text-sm",
        };
      case "xl":
      default:
        return {
          container: "max-w-[300px] aspect-[3/4]",
          imagePadding: "p-0",
          placeholderIcon: "h-12 w-12",
          placeholderText: "text-sm",
        };
    }
  }, [displaySize]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (multiple) {
        // Handle multiple file uploads
        const multipleProps = props as MultipleImageUploadProps;
        const maxImages = multipleProps.maxImages || 5;

        // Calculate how many new images we can add
        const remainingSlots = maxImages - multipleProps.value.length;
        if (remainingSlots <= 0) return;

        // Process only as many files as we have slots for
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        // Create preview URLs
        const previewUrls = filesToProcess.map((file) =>
          URL.createObjectURL(file),
        );

        // Notify parent of selected files
        if (onFileSelect && multipleProps.onFileSelect) {
          multipleProps.onFileSelect(filesToProcess);
        }

        // Update preview state
        setPreviewUrl(previewUrls[0] || null); // Show first image as preview
      } else {
        // Handle single file upload
        const singleProps = props as SingleImageUploadProps;
        const file = files[0];

        if (!file) return;

        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
          toast.error("Please upload a JPEG, PNG, or WebP image");
          return;
        }

        // Store the file for later upload
        selectedFileRef.current = file;

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setPreviewUrl(previewUrl);

        // Notify parent of selected file
        if (onFileSelect && singleProps.onFileSelect) {
          singleProps.onFileSelect(file);
        }
      }
    } catch (error) {
      console.error("Error processing image(s):", error);
      toast.error("Failed to process image(s)");
    } finally {
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = async (imageUrl: string) => {
    if (multiple) {
      const multipleProps = props as MultipleImageUploadProps;
      try {
        await removeImageFromStorage(imageUrl, bucketName);
        multipleProps.onChange(
          multipleProps.value.filter((url) => url !== imageUrl),
        );
      } catch (error) {
        console.error("Error removing image:", error);
      }
    } else {
      const singleProps = props as SingleImageUploadProps;
      try {
        await removeImageFromStorage(imageUrl, bucketName);
        singleProps.onChange(null);
      } catch (error) {
        console.error("Error removing image:", error);
      }
    }
  };

  if (!multiple) {
    const singleProps = props as SingleImageUploadProps;
    return (
      <Card
        className={cn(
          "group relative cursor-pointer border-2 border-dashed border-primary/40 hover:border-primary/70 transition-colors duration-200",
          "bg-card",
          "overflow-hidden",
          sizeClasses.container, // Apply container size class
          className, // Allow overriding/extending
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-primary/50", "bg-primary/5");
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            const event = {
              target: { files },
            } as React.ChangeEvent<HTMLInputElement>;
            handleImageUpload(event);
          }
        }}
      >
        <CardContent className="p-0 flex items-center justify-center relative h-full w-full">
          {" "}
          {/* Ensure content fills card */}
          {singleProps.value ? (
            <div className="relative w-full h-full">
              <Image
                src={singleProps.value}
                alt="Image preview"
                className={cn(
                  "object-contain w-full h-full",
                  sizeClasses.imagePadding,
                  imageClassName,
                )}
                fill={false}
                width={500}
                height={700}
                sizes="(max-width: 640px) 100vw, 300px"
                priority
                onError={(e) => {
                  console.error("Failed to load image:", singleProps.value);
                  const target = e.target as HTMLImageElement;
                  const parentDiv = target.closest("div");
                  if (parentDiv) parentDiv.style.display = "none";
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full shadow-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  singleProps.value && removeImage(singleProps.value);
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove image</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center h-full w-full cursor-pointer p-4">
              <ImageIcon
                className={cn(
                  "text-muted-foreground/30 group-hover:text-primary/40 transition-colors",
                  sizeClasses.placeholderIcon, // Apply placeholder icon size
                )}
              />
              <p
                className={cn(
                  "text-muted-foreground/50 group-hover:text-primary/50 transition-colors mt-2",
                  sizeClasses.placeholderText, // Apply placeholder text size
                )}
              >
                Click or drag file
              </p>
            </div>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleImageUpload}
          />
        </CardContent>
      </Card>
    );
  }

  // Render for multiple image mode
  const multipleProps = props as MultipleImageUploadProps;
  const maxImages = multipleProps.maxImages || 5;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Images */}
      {multipleProps.value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {multipleProps.value.map((url, index) => (
            <Card
              key={`image-${index}`}
              className="relative aspect-square overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
            >
              <CardContent className="p-0">
                <Image
                  src={url}
                  alt={`Image ${index + 1}`}
                  className={cn("object-cover", imageClassName)}
                  fill
                  onError={(e) => {
                    console.error("Failed to load image:", url);
                    const target = e.target as HTMLImageElement;
                    const parentDiv = target.closest("div");
                    if (parentDiv) parentDiv.style.display = "none";
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm bg-destructive/90 hover:bg-destructive hover:scale-110"
                  onClick={() => removeImage(url)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove image</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Image Button */}
      {multipleProps.value.length < maxImages && (
        <Card
          className="cursor-pointer border-2 border-dashed hover:border-primary/50 hover:bg-primary/5"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("border-primary/50", "bg-primary/5");
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove(
              "border-primary/50",
              "bg-primary/5",
            );
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove(
              "border-primary/50",
              "bg-primary/5",
            );
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              const event = {
                target: { files },
              } as React.ChangeEvent<HTMLInputElement>;
              handleImageUpload(event);
            }
          }}
        >
          <CardContent className="p-6">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleImageUpload}
              multiple
            />
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-10 w-10 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
              <p className="text-sm text-muted-foreground/50 group-hover:text-primary/50 transition-colors">
                Click or drag and drop to upload (
                {maxImages - multipleProps.value.length} remaining)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export async function uploadAndCompressImage(
  file: File,
  existingImageUrl: string | null = null,
  bucketName: string,
  targetSize: number,
  maxDimension: number,
): Promise<string> {
  // First, compress the image using our API with balanced quality settings
  const formData = new FormData();
  formData.append("image", file);
  formData.append("preserveAspectRatio", "true");
  formData.append("targetSize", targetSize.toString());
  formData.append("maxDimension", maxDimension.toString());
  formData.append("quality", "75"); // Increased quality from 40 to 75 for better image quality while maintaining reasonable compression
  formData.append("format", "webp");

  const compressionResponse = await fetch("/api/images/compress", {
    method: "POST",
    body: formData,
  });

  if (!compressionResponse.ok) {
    const errorData = await compressionResponse.json();
    throw new Error(
      `Image compression failed: ${errorData.error || compressionResponse.statusText}`,
    );
  }

  const compressionResult = await compressionResponse.json();
  if (!compressionResult.success) {
    throw new Error(
      `Image compression failed: ${compressionResult.error || "Unknown error"}`,
    );
  }

  // Convert base64 to blob
  const base64Response = await fetch(compressionResult.data.image);
  const compressedBlob = await base64Response.blob();

  // Create a File object from the blob
  const compressedFile = new File(
    [compressedBlob],
    `${file.name.split(".")[0]}.webp`,
    { type: "image/webp" },
  );

  // Check if there's an existing image to delete it
  if (existingImageUrl) {
    await removeImageFromStorage(existingImageUrl, bucketName);
  }

  // TODO: Implement image upload using UserService
  // For now, we'll return a mock URL
  console.log("Uploading compressed image:", {
    file: compressedFile.name,
    bucketName,
    targetSize,
    maxDimension,
  });

  // Mock upload - replace with actual UserService implementation
  const mockUrl = `https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=600&fit=crop&t=${Date.now()}`;

  return mockUrl;
}
