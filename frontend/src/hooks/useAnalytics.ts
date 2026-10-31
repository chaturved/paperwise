"use client";

import { useEffect, useMemo, useState } from "react";
import { getOverview, getQueryVolume, getTopCitations } from "@/lib/api/analytics";
import { getUsage } from "@/lib/api/users";
import type { AnalyticsOverview, CitedDoc, QueryVolumePoint, Usage } from "@/types";

type RangeDays = 7 | 30;

export function useAnalytics() {
  const [days, setDays] = useState<RangeDays>(7);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [volume, setVolume] = useState<QueryVolumePoint[]>([]);
  const [citations, setCitations] = useState<CitedDoc[]>([]);
  const [accountUsage, setAccountUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setVolume([]);

    Promise.all([getOverview(), getQueryVolume(days), getTopCitations()])
      .then(([nextOverview, nextVolume, nextCitations]) => {
        if (!active) return;
        setOverview(nextOverview);
        setVolume(nextVolume);
        setCitations(nextCitations);
      })
      .catch(() => {
        if (active) setError("Could not load analytics right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [days, refreshKey]);

  useEffect(() => {
    let active = true;
    getUsage()
      .then((usage) => {
        if (active) setAccountUsage(usage);
      })
      .catch(() => {
        if (active) setAccountUsage(null);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const dailyVolume = useMemo(() => {
    const counts = new Map(volume.map((point) => [point.date, point.count]));
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { date: key, count: counts.get(key) ?? 0 } satisfies QueryVolumePoint;
    });
  }, [days, volume]);

  return {
    days,
    setDays,
    overview,
    dailyVolume,
    citations,
    accountUsage,
    loading,
    error,
    retry: () => setRefreshKey((key) => key + 1),
  };
}
