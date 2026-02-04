"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTabManager, TabInfo } from "@/hooks/useTabManager";

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const statusColors = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
};

const statusBadgeVariant = {
  ok: "default" as const,
  warning: "secondary" as const,
  critical: "destructive" as const,
};

interface TabManagerWidgetProps {
  maxTabs?: number;
  warnAt?: number;
}

export function TabManagerWidget({ maxTabs = 5, warnAt = 4 }: TabManagerWidgetProps) {
  const {
    tabs,
    tabCount,
    currentTabId,
    status,
    isOverLimit,
    requestCloseTab,
    closeOldestTabs,
    config,
  } = useTabManager({ maxTabs, warnAt });

  // Sort tabs: current first, then by last activity (most recent first)
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.isCurrentTab) return -1;
    if (b.isCurrentTab) return 1;
    return b.lastActivity - a.lastActivity;
  });

  return (
    <Card className={isOverLimit ? "border-red-500 border-2" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            Tab Manager
          </div>
          <Badge variant={statusBadgeVariant[status]}>
            {tabCount}/{config.maxTabs} tabs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Status message */}
          {status === "critical" && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
              Too many tabs open! Close some to improve performance.
            </div>
          )}
          {status === "warning" && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
              Approaching tab limit. Consider closing unused tabs.
            </div>
          )}

          {/* Quick actions */}
          {tabCount > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeOldestTabs(1)}
                className="text-xs"
              >
                Keep only this tab
              </Button>
              {isOverLimit && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => closeOldestTabs(config.maxTabs)}
                  className="text-xs"
                >
                  Close excess tabs
                </Button>
              )}
            </div>
          )}

          {/* Tab list */}
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Open Tabs
            </span>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {sortedTabs.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  onClose={() => requestCloseTab(tab.id)}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Session tabs</span>
              <span>{tabCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Max allowed</span>
              <span>{config.maxTabs}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabItem({ tab, onClose }: { tab: TabInfo; onClose: () => void }) {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded text-sm ${
        tab.isCurrentTab
          ? "bg-primary/10 border border-primary/20"
          : "bg-muted/50 hover:bg-muted"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {tab.isCurrentTab && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
          <span className="truncate font-medium">
            {tab.isCurrentTab ? "This tab" : tab.title || "Dashboard"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Active {formatTimeAgo(tab.lastActivity)}
        </div>
      </div>
      {!tab.isCurrentTab && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          title="Request tab to close"
        >
          ✕
        </Button>
      )}
    </div>
  );
}
