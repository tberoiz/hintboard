import { useRef, useState } from "react";
import { UserIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Input,
} from "@hintboard/ui/component";
import { cn } from "@hintboard/ui/utils";
import { formatFileSize } from "@/shared/utils/format-file-size";
import { toast } from "sonner";

interface AvatarUploadProps {
  value?: File | string;
  onChange: (file: File | undefined) => void;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarUpload({
  value,
  onChange,
  size = "lg",
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    typeof value === "string" ? value : undefined,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        `Maximum size is 5MB (Your file: ${formatFileSize(file.size)})`,
      );
      return;
    }

    // Create preview URL using FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    onChange(file);

    // Clear the input value so the same file can be selected again
    e.target.value = "";
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative group", className)}>
      <Avatar
        onClick={handleClick}
        className={cn(
          "ring-2 ring-background hover:ring-secondary group-hover:opacity-75 transition-opacity cursor-pointer rounded-full",
          {
            "!w-16 !h-16": size === "sm",
            "!w-20 !h-20": size === "md",
            "!w-24 !h-24": size === "lg",
            "!w-32 !h-32": size === "xl",
          },
        )}
        style={{
          width:
            size === "sm"
              ? "64px"
              : size === "md"
                ? "80px"
                : size === "lg"
                  ? "96px"
                  : "128px",
          height:
            size === "sm"
              ? "64px"
              : size === "md"
                ? "80px"
                : size === "lg"
                  ? "96px"
                  : "128px",
        }}
      >
        <AvatarImage src={previewUrl} alt="Profile" className="object-cover" />
        <AvatarFallback className="rounded-full">
          <UserIcon
            className={cn("text-muted-foreground", {
              "w-8 h-8": size === "sm",
              "w-10 h-10": size === "md",
              "w-12 h-12": size === "lg",
              "w-16 h-16": size === "xl",
            })}
          />
        </AvatarFallback>
      </Avatar>
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload profile picture"
      />
    </div>
  );
}
