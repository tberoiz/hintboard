import { useEffect, useState } from "react";

/**
 * Hook to get the primary color from CSS variables as a hex value
 * Useful for color pickers that require hex format
 */
export function usePrimaryColor(): string {
  const [primaryColor, setPrimaryColor] = useState("#6366f1"); // fallback

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const primaryHsl = computedStyle.getPropertyValue("--primary").trim();

    if (primaryHsl) {
      // Convert HSL format "H S% L%" to hex
      const values = primaryHsl.split(" ").map((val) => {
        if (val.endsWith("%")) {
          return parseFloat(val) / 100;
        }
        return parseFloat(val);
      });

      // Ensure we have valid numbers before proceeding
      if (values.length === 3 && values.every((v) => !isNaN(v))) {
        const [h, s, l] = values as [number, number, number];
        const hex = hslToHex(h, s, l);
        setPrimaryColor(hex);
      }
    }
  }, []);

  return primaryColor;
}

/**
 * Convert HSL to hex
 * @param h Hue in degrees (0-360)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 */
function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
