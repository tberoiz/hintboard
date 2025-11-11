export function getBlurDataURL(imageUrl: string): string {
  // This is a base64 encoded 1x1 transparent pixel
  const blurDataURL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return blurDataURL;
}

export function isAboveTheFold(index: number): boolean {
  // Consider the first 12 items as above the fold
  return index < 12;
}
