"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface TabInfo {
  id: string;
  openedAt: number;
  lastActivity: number;
  url: string;
  title: string;
  isCurrentTab: boolean;
}

export interface TabManagerConfig {
  maxTabs: number;
  warnAt: number; // Warn when tab count reaches this
  autoCloseInactive: boolean;
  inactiveThresholdMs: number; // Close tabs inactive for this long
}

const DEFAULT_CONFIG: TabManagerConfig = {
  maxTabs: 5,
  warnAt: 4,
  autoCloseInactive: false,
  inactiveThresholdMs: 30 * 60 * 1000, // 30 minutes
};

const STORAGE_KEY = "clawdbot-tab-manager";
const CHANNEL_NAME = "clawdbot-tab-sync";

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useTabManager(customConfig?: Partial<TabManagerConfig>) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [currentTabId] = useState(() => generateTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Create broadcast channel
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported, fall back to localStorage only
      console.warn("BroadcastChannel not supported, using localStorage fallback");
    }

    // Get current tab info
    const currentTab: TabInfo = {
      id: currentTabId,
      openedAt: Date.now(),
      lastActivity: Date.now(),
      url: window.location.href,
      title: document.title || "Clawdbot Dashboard",
      isCurrentTab: true,
    };

    // Load existing tabs from storage
    const loadTabs = (): TabInfo[] => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as TabInfo[];
          // Filter out stale tabs (inactive for more than 5 minutes without heartbeat)
          const now = Date.now();
          return parsed.filter((t) => now - t.lastActivity < 5 * 60 * 1000);
        }
      } catch {
        console.error("Failed to load tabs from storage");
      }
      return [];
    };

    // Save tabs to storage
    const saveTabs = (tabList: TabInfo[]) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabList));
      } catch {
        console.error("Failed to save tabs to storage");
      }
    };

    // Register current tab
    const existingTabs = loadTabs();
    const updatedTabs = [
      ...existingTabs.filter((t) => t.id !== currentTabId),
      currentTab,
    ];
    saveTabs(updatedTabs);
    setTabs(updatedTabs.map((t) => ({ ...t, isCurrentTab: t.id === currentTabId })));

    // Broadcast tab opened
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "TAB_OPENED", tab: currentTab });
    }

    // Handle messages from other tabs
    const handleMessage = (event: MessageEvent) => {
      const { type, tab, tabId } = event.data;

      switch (type) {
        case "TAB_OPENED":
        case "TAB_HEARTBEAT":
          setTabs((prev) => {
            const filtered = prev.filter((t) => t.id !== tab.id);
            const updated = [...filtered, { ...tab, isCurrentTab: false }];
            saveTabs(updated);
            return updated.map((t) => ({ ...t, isCurrentTab: t.id === currentTabId }));
          });
          break;

        case "TAB_CLOSED":
          setTabs((prev) => {
            const filtered = prev.filter((t) => t.id !== tabId);
            saveTabs(filtered);
            return filtered;
          });
          break;

        case "REQUEST_CLOSE":
          if (tabId === currentTabId) {
            // Another tab is requesting this tab to close
            window.close();
          }
          break;

        case "TABS_SYNC_REQUEST":
          // Another tab is asking for current state
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: "TAB_HEARTBEAT",
              tab: {
                ...currentTab,
                lastActivity: Date.now(),
                url: window.location.href,
                title: document.title,
              },
            });
          }
          break;
      }
    };

    if (channelRef.current) {
      channelRef.current.addEventListener("message", handleMessage);
    }

    // Heartbeat to keep tab registered
    heartbeatRef.current = setInterval(() => {
      const updatedTab: TabInfo = {
        id: currentTabId,
        openedAt: currentTab.openedAt,
        lastActivity: Date.now(),
        url: window.location.href,
        title: document.title || "Clawdbot Dashboard",
        isCurrentTab: true,
      };

      if (channelRef.current) {
        channelRef.current.postMessage({ type: "TAB_HEARTBEAT", tab: updatedTab });
      }

      // Also update local storage
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== currentTabId);
        const updated = [...filtered, updatedTab];
        saveTabs(updated);
        return updated.map((t) => ({ ...t, isCurrentTab: t.id === currentTabId }));
      });
    }, 30000); // Every 30 seconds

    // Request sync from other tabs on load
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "TABS_SYNC_REQUEST" });
    }

    // Cleanup on unmount/tab close
    const cleanup = () => {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "TAB_CLOSED", tabId: currentTabId });
        channelRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      // Remove from storage
      const remaining = loadTabs().filter((t) => t.id !== currentTabId);
      saveTabs(remaining);
    };

    window.addEventListener("beforeunload", cleanup);

    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [currentTabId]);

  // Auto-close inactive tabs if enabled
  useEffect(() => {
    if (!config.autoCloseInactive) return;

    const checkInactive = setInterval(() => {
      const now = Date.now();
      const currentTab = tabs.find((t) => t.isCurrentTab);
      if (currentTab && now - currentTab.lastActivity > config.inactiveThresholdMs) {
        // This tab is inactive, close it
        window.close();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInactive);
  }, [config.autoCloseInactive, config.inactiveThresholdMs, tabs]);

  // Request another tab to close
  const requestCloseTab = useCallback((tabId: string) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "REQUEST_CLOSE", tabId });
    }
  }, []);

  // Close oldest tabs to get under the limit
  const closeOldestTabs = useCallback((keepCount: number = config.maxTabs) => {
    const sortedTabs = [...tabs]
      .filter((t) => !t.isCurrentTab)
      .sort((a, b) => a.lastActivity - b.lastActivity);

    const tabsToClose = sortedTabs.slice(0, Math.max(0, tabs.length - keepCount));

    tabsToClose.forEach((tab) => {
      requestCloseTab(tab.id);
    });
  }, [tabs, config.maxTabs, requestCloseTab]);

  // Get status info
  const tabCount = tabs.length;
  const isOverLimit = tabCount > config.maxTabs;
  const isNearLimit = tabCount >= config.warnAt;
  const status: "ok" | "warning" | "critical" = isOverLimit
    ? "critical"
    : isNearLimit
    ? "warning"
    : "ok";

  return {
    tabs,
    tabCount,
    currentTabId,
    config,
    status,
    isOverLimit,
    isNearLimit,
    requestCloseTab,
    closeOldestTabs,
  };
}
