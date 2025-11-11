import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Constants for image compression
const DEFAULT_TARGET_SIZE = 1024 * 1024; // 1MB default target (increased from 25KB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max input size (increased from 5MB)
const DEFAULT_MAX_DIMENSION = 2000; // Default max dimension (increased from 1000)
const MIN_QUALITY = 60; // Lowest quality we'll go (increased from 40)
const DEFAULT_QUALITY = 85; // Starting quality (increased from 80)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const preserveAspectRatio = formData.get("preserveAspectRatio") === "true";

    // Get target size from form data or use default
    const targetSizeParam = formData.get("targetSize");
    const targetSize = targetSizeParam
      ? parseInt(targetSizeParam.toString(), 10)
      : DEFAULT_TARGET_SIZE;

    // Get max dimension from form data or use default
    const maxDimensionParam = formData.get("maxDimension");
    const maxDimension = maxDimensionParam
      ? parseInt(maxDimensionParam.toString(), 10)
      : DEFAULT_MAX_DIMENSION;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check if the file is HEIC
    const isHeic =
      file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic");

    // Get the image metadata to determine dimensions
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch (error) {
      if (isHeic) {
        return NextResponse.json(
          {
            error:
              "HEIC images are not supported. Please convert your image to JPEG or PNG before uploading.",
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const { width = 0, height = 0 } = metadata;

    // Calculate new dimensions
    const newWidth =
      width > height
        ? maxDimension
        : Math.round((maxDimension * width) / height);
    const newHeight =
      height > width
        ? maxDimension
        : Math.round((maxDimension * height) / width);

    // Adaptive compression - try multiple quality settings if needed
    let quality = DEFAULT_QUALITY;
    let attempts = 0;

    // Function to compress with current settings
    const compressWithQuality = async (q: number, w: number, h: number) => {
      return sharp(buffer)
        .resize(w, h, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: q, effort: 6 })
        .toBuffer();
    };

    // First attempt
    let compressedBuffer = await compressWithQuality(
      quality,
      newWidth,
      newHeight,
    );

    // Binary search approach for finding optimal quality
    let minQ = MIN_QUALITY;
    let maxQ = DEFAULT_QUALITY;

    // Keep trying lower quality until we hit target size or min quality
    while (
      compressedBuffer.length > targetSize &&
      quality > MIN_QUALITY &&
      attempts < 5
    ) {
      attempts++;

      // Adjust quality based on how far we are from target
      const ratio = compressedBuffer.length / targetSize;

      if (ratio > 3) {
        // We're way off - reduce quality significantly
        quality = Math.max(MIN_QUALITY, Math.floor(quality / 2));
      } else {
        // Binary search approach
        maxQ = quality;
        quality = Math.max(MIN_QUALITY, Math.floor((minQ + maxQ) / 2));
      }

      compressedBuffer = await compressWithQuality(
        quality,
        newWidth,
        newHeight,
      );
    }

    // If we still can't get small enough, try reducing dimensions further
    if (compressedBuffer.length > targetSize * 1.5) {
      // Reduce dimensions more aggressively
      const scaleFactor = Math.sqrt(targetSize / compressedBuffer.length);
      const reducedWidth = Math.floor(newWidth * scaleFactor);
      const reducedHeight = Math.floor(newHeight * scaleFactor);

      compressedBuffer = await compressWithQuality(
        quality,
        reducedWidth,
        reducedHeight,
      );
    }

    // Final check
    if (compressedBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image too large after compression" },
        { status: 400 },
      );
    }

    // Convert buffer to base64
    const base64Image = `data:image/webp;base64,${compressedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      data: {
        image: base64Image,
        size: compressedBuffer.length,
        width: newWidth,
        height: newHeight,
        quality,
        originalSize: file.size,
      },
    });
  } catch (error) {
    console.error("Image compression error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to compress image",
      },
      { status: 500 },
    );
  }
}
