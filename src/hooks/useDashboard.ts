"use client";

import { useState, useEffect, useCallback } from "react";

export interface DashboardData {
  gateway: {
    running: boolean;
    channels: { name: string; status: "connected" | "disconnected" | "error" }[];
  };
  cron: {
    id: string;
    name: string;
    enabled: boolean;
    schedule: string;
    nextRunAtMs: number;
    lastStatus: "ok" | "error" | "pending";
  }[];
  weather: {
    location: string;
    temperature: string;
    condition: string;
    humidity: string;
    wind: string;
  };
  emails: {
    id: string;
    from: string;
    subject: string;
    date: string;
    priority: "high" | "medium" | "low";
  }[];
  calendar: {
    id: string;
    title: string;
    start: string;
    end?: string;
    isAllDay: boolean;
  }[];
  fetchedAt: string;
}

interface UseDashboardOptions {
  refreshInterval?: number; // ms, default 60000 (1 minute)
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { refreshInterval = 60000 } = options;
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const json = await response.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    lastRefresh,
    refresh: fetchData,
  };
}
