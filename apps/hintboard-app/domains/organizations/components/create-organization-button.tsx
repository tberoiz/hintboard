"use client";

import { Button } from "@hintboard/ui/component";
import { Plus, Crown } from "lucide-react";
import Link from "next/link";
import { useSubscriptionLimits } from "@/shared/contexts/subscription-limits-context";
import { useState } from "react";
import { UpgradeModal } from "@/features/billing/components/upgrade-modal";

export function CreateOrganizationButton() {
  const { checkLimit, loading } = useSubscriptionLimits();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check if user can create more organizations
  const canCreateOrg = !loading && checkLimit("boards");

  if (loading) {
    return (
      <Button variant="link" disabled className="text-primary">
        <Plus className="h-4 w-4 mr-2" />
        Create new company
      </Button>
    );
  }

  // User has reached their limit - show upgrade button with crown
  if (!canCreateOrg) {
    return (
      <>
        <Button
          variant="link"
          className="text-primary"
          onClick={() => setShowUpgradeModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create new company
          <Crown className="h-4 w-4 ml-2 text-amber-500" />
        </Button>

        {/* Replace with your actual upgrade modal */}
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          trialDaysRemaining={0}
        />
      </>
    );
  }

  // User can create organizations - show link
  return (
    <Link href="/organizations/new">
      <Button variant="link" className="text-primary">
        <Plus className="h-4 w-4 mr-2" />
        Create new company
      </Button>
    </Link>
  );
}
