"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "work" | "personal";
  onModeChange: (mode: "work" | "personal") => void;
  visibleWidgets: string[];
  onWidgetsChange: (widgets: string[]) => void;
}

const allWidgets = [
  { id: "memory", name: "Memory Vault", icon: "🧠" },
  { id: "reports", name: "Reports (Reddit/X)", icon: "📈" },
  { id: "saas-ideas", name: "SaaS Ideas", icon: "💡" },
  { id: "sns-engagement", name: "SNS Engagement", icon: "📊" },
  { id: "cron", name: "Cron Jobs", icon: "⏰" },
  { id: "clawdbot-control", name: "Clawdbot Control", icon: "🦞" },
  { id: "email", name: "Email", icon: "📬" },
  { id: "calendar", name: "Calendar", icon: "📅" },
  { id: "status", name: "Gateway Status", icon: "🟢" },
  { id: "capture", name: "Quick Capture", icon: "✏️" },
  { id: "briefing", name: "Daily Briefing", icon: "📰" },
];

export function SettingsPanel({
  isOpen,
  onClose,
  mode,
  onModeChange,
  visibleWidgets,
  onWidgetsChange,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const toggleWidget = (widgetId: string) => {
    if (visibleWidgets.includes(widgetId)) {
      onWidgetsChange(visibleWidgets.filter((w) => w !== widgetId));
    } else {
      onWidgetsChange([...visibleWidgets, widgetId]);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">⚙️ Settings</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Theme */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {mounted && (
                  <>
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex-1"
                    >
                      ☀️ Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex-1"
                    >
                      🌙 Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="flex-1"
                    >
                      💻 System
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mode */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={mode === "work" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModeChange("work")}
                  className="flex-1"
                >
                  💼 Work
                </Button>
                <Button
                  variant={mode === "personal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModeChange("personal")}
                  className="flex-1"
                >
                  🏠 Personal
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {mode === "work"
                  ? "Focus on calendar, email, and projects"
                  : "Focus on sports, twitter, and personal stuff"}
              </p>
            </CardContent>
          </Card>

          {/* Visible Widgets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Visible Widgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allWidgets.map((widget) => {
                  const isVisible = visibleWidgets.includes(widget.id);
                  return (
                    <button
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        isVisible
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{widget.icon}</span>
                        <span className="text-sm">{widget.name}</span>
                      </div>
                      <Badge variant={isVisible ? "default" : "outline"}>
                        {isVisible ? "Visible" : "Hidden"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {/* Reset */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onWidgetsChange(allWidgets.map((w) => w.id));
              onModeChange("work");
              setTheme("system");
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </>
  );
}
