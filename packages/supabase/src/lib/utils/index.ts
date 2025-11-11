/**
 * Safely sums quantities from nested arrays in any object.
 * @param items Array of objects that contain nested arrays
 * @param nestedKey Key of the nested array to sum
 * @param quantityKey Key in nested object that holds quantity (default: "quantity")
 * @returns Total quantity
 */
export function sumNestedQuantities<
  T extends Record<string, any>,
  K extends keyof T,
>(
  items: T[] | null | undefined,
  nestedKey: K,
  quantityKey: string = "quantity",
): number {
  if (!items) return 0;

  return items.reduce((total: number, item: T) => {
    const nestedArray = item[nestedKey] as
      | Array<Record<string, any>>
      | undefined;
    if (!nestedArray) return total;

    return (
      total +
      nestedArray.reduce((sum: number, entry: Record<string, any>) => {
        return sum + (entry[quantityKey] ?? 0);
      }, 0)
    );
  }, 0);
}
