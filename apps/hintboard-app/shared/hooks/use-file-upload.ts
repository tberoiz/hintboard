import { useState, useCallback } from "react";
import { toast } from "sonner";
import { formatFileSize } from "@/shared/utils/format-file-size";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const useFileUpload = ({
  initialPreview = "",
  maxSize = MAX_FILE_SIZE,
  validTypes = ["image/*"],
  compressImage = true,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialPreview);
  const [isLoading, setIsLoading] = useState(false);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (input: File | React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile =
        input instanceof File ? input : input.target.files?.[0];
      if (!selectedFile) return;

      if (selectedFile.size > maxSize) {
        toast.error(`Max size: ${formatFileSize(maxSize)}`);
        return;
      }

      if (!validTypes.some((type) => selectedFile.type.match(type))) {
        toast.error("Please upload an image");
        return;
      }

      setIsLoading(true);
      try {
        // First show the original image preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
          setFile(selectedFile);
        };
        reader.readAsDataURL(selectedFile);

        // Then compress the image if needed
        if (compressImage) {
          const formData = new FormData();
          formData.append("image", selectedFile);

          const response = await fetch("/api/images/compress", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Failed to compress image");
          }

          setCompressedImage(result.data.image);
          setPreview(result.data.image); // Update preview with compressed image
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Please try again",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [maxSize, validTypes, compressImage],
  );

  const resetFile = useCallback(() => {
    setFile(null);
    setPreview(initialPreview);
    setCompressedImage(null);
  }, [initialPreview]);

  const getCompressedImage = useCallback(() => {
    return compressedImage;
  }, [compressedImage]);

  return {
    file,
    preview,
    isLoading,
    handleFileChange,
    resetFile,
    getCompressedImage,
  };
};
