"use client";

import { useState, useEffect, useCallback } from "react";

interface DashboardSettings {
  mode: "work" | "personal";
  visibleWidgets: string[];
  layout: "default" | "compact" | "expanded";
}

const defaultSettings: DashboardSettings = {
  mode: "work",
  visibleWidgets: [
    "memory",
    "reports",
    "saas-ideas",
    "sns-engagement",
    "cron",
    "clawdbot-control",
    "email",
    "calendar",
    "status",
    "capture",
  ],
  layout: "default",
};

// Work mode — focused on business
const workModeWidgets = [
  "memory",
  "reports",
  "saas-ideas",
  "sns-engagement",
  "cron",
  "clawdbot-control",
  "email",
  "calendar",
  "status",
  "capture",
];

// Personal mode — minimal
const personalModeWidgets = [
  "memory",
  "reports",
  "sns-engagement",
  "calendar",
  "status",
  "capture",
];

const STORAGE_KEY = "clawdbot-dashboard-settings";

// Bump this version whenever the widget list changes to force a reset
const SETTINGS_VERSION = 3;

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If settings are from an older version, reset to defaults
        if (!parsed._version || parsed._version < SETTINGS_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
          setSettings(defaultSettings);
        } else {
          setSettings({ ...defaultSettings, ...parsed });
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, _version: SETTINGS_VERSION }));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
    }
  }, [settings, isLoaded]);

  const setMode = useCallback((mode: "work" | "personal") => {
    setSettings((prev) => ({
      ...prev,
      mode,
      visibleWidgets: mode === "work" ? workModeWidgets : personalModeWidgets,
    }));
  }, []);

  const setVisibleWidgets = useCallback((widgets: string[]) => {
    setSettings((prev) => ({ ...prev, visibleWidgets: widgets }));
  }, []);

  const setLayout = useCallback((layout: "default" | "compact" | "expanded") => {
    setSettings((prev) => ({ ...prev, layout }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  // Get time-based greeting
  const getTimeOfDay = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 6) return "night";
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
  }, []);

  const getGreeting = useCallback(() => {
    const timeOfDay = getTimeOfDay();
    const greetings = {
      night: "🌙 Good night",
      morning: "🌅 Good morning",
      afternoon: "☀️ Good afternoon",
      evening: "🌆 Good evening",
    };
    return greetings[timeOfDay];
  }, [getTimeOfDay]);

  return {
    ...settings,
    isLoaded,
    setMode,
    setVisibleWidgets,
    setLayout,
    resetSettings,
    getTimeOfDay,
    getGreeting,
  };
}
