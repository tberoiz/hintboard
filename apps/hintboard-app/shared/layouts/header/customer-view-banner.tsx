"use client";

import { Eye, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@hintboard/ui/component";

export function CustomerViewBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isViewingAsCustomer = searchParams.get("viewAsCustomer") === "true";

  if (!isViewingAsCustomer) return null;

  const handleExitCustomerView = () => {
    // Remove the viewAsCustomer parameter and refresh
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("viewAsCustomer");

    const newUrl = newParams.toString()
      ? `${window.location.pathname}?${newParams.toString()}`
      : window.location.pathname;

    router.push(newUrl);
    router.refresh();
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800">
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Spacer for balance */}
        <div className="w-32"></div>

        {/* Centered content */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-amber-900 dark:text-amber-100 font-medium">
            Viewing as Customer
          </span>
        </div>

        {/* Exit button */}
        <div className="w-32 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitCustomerView}
            className="h-7 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
