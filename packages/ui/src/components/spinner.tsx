import { LoaderIcon, LoaderPinwheel } from "lucide-react";

import { cn } from "#lib/utils.js";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderPinwheel
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
