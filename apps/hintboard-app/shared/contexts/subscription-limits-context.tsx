"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  SubscriptionLimitsService,
  type PlanLimits,
  type LimitType,
  type FeatureType,
} from "@hintboard/supabase/services";

interface SubscriptionLimitsContextValue {
  limits: PlanLimits | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  checkLimit: (limitType: LimitType) => boolean;
  checkFeature: (feature: FeatureType) => boolean;
  getRemainingUsage: (limitType: LimitType) => {
    remaining: number;
    total: number;
    isUnlimited: boolean;
  };
  incrementUsage: (limitType: LimitType) => void;
  decrementUsage: (limitType: LimitType) => void;
}

const SubscriptionLimitsContext = createContext<
  SubscriptionLimitsContextValue | undefined
>(undefined);

export function SubscriptionLimitsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SubscriptionLimitsService.getUserLimits("client");
      setLimits(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch limits"),
      );
      console.error("Error fetching subscription limits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const checkLimit = (limitType: LimitType): boolean => {
    if (!limits) return false;

    const limitMap: Record<LimitType, { limit: number; used: number }> = {
      boards: { limit: limits.boardsLimit, used: limits.boardsUsed },
      email_subscribers: {
        limit: limits.emailSubscribersLimit,
        used: limits.emailSubscribersUsed,
      },
      ai_announcements: {
        limit: limits.aiAnnouncementsLimit,
        used: limits.aiAnnouncementsUsed,
      },
    };

    const { limit, used } = limitMap[limitType];

    // -1 means unlimited
    if (limit === -1) return true;

    return used < limit;
  };

  const checkFeature = (feature: FeatureType): boolean => {
    if (!limits) return false;
    return limits[feature];
  };

  const getRemainingUsage = (limitType: LimitType) => {
    if (!limits) {
      return { remaining: 0, total: 0, isUnlimited: false };
    }

    const limitMap: Record<LimitType, { limit: number; used: number }> = {
      boards: { limit: limits.boardsLimit, used: limits.boardsUsed },
      email_subscribers: {
        limit: limits.emailSubscribersLimit,
        used: limits.emailSubscribersUsed,
      },
      ai_announcements: {
        limit: limits.aiAnnouncementsLimit,
        used: limits.aiAnnouncementsUsed,
      },
    };

    const { limit, used } = limitMap[limitType];

    if (limit === -1) {
      return { remaining: Infinity, total: Infinity, isUnlimited: true };
    }

    return {
      remaining: Math.max(0, limit - used),
      total: limit,
      isUnlimited: false,
    };
  };

  const adjustUsage = (limitType: LimitType, delta: number) => {
    const usageKeyMap: Record<
      LimitType,
      keyof Pick<
        PlanLimits,
        "boardsUsed" | "emailSubscribersUsed" | "aiAnnouncementsUsed"
      >
    > = {
      boards: "boardsUsed",
      email_subscribers: "emailSubscribersUsed",
      ai_announcements: "aiAnnouncementsUsed",
    };

    setLimits((prev) => {
      if (!prev) return prev;

      const usageKey = usageKeyMap[limitType];
      const nextValue = Math.max(0, prev[usageKey] + delta);

      return {
        ...prev,
        [usageKey]: nextValue,
      };
    });
  };

  const incrementUsage = (limitType: LimitType) => adjustUsage(limitType, 1);
  const decrementUsage = (limitType: LimitType) => adjustUsage(limitType, -1);

  return (
    <SubscriptionLimitsContext.Provider
      value={{
        limits,
        loading,
        error,
        refetch: fetchLimits,
        checkLimit,
        checkFeature,
        getRemainingUsage,
        incrementUsage,
        decrementUsage,
      }}
    >
      {children}
    </SubscriptionLimitsContext.Provider>
  );
}

export function useSubscriptionLimits() {
  const context = useContext(SubscriptionLimitsContext);
  if (context === undefined) {
    throw new Error(
      "useSubscriptionLimits must be used within a SubscriptionLimitsProvider",
    );
  }
  return context;
}
