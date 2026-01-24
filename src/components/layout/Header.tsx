"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

interface HeaderProps {
  weather?: {
    temperature: string;
    condition: string;
  };
  mode?: "work" | "personal";
  greeting?: string;
  onSettingsClick?: () => void;
}

export function Header({ weather, mode, greeting, onSettingsClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <div>
            <h1 className="text-xl font-semibold">Clawdbot Dashboard</h1>
            {greeting && (
              <p className="text-sm text-muted-foreground">{greeting}</p>
            )}
          </div>
          <Badge variant="outline" className="ml-2">
            v0.1.0
          </Badge>
          {mode && (
            <Badge variant={mode === "work" ? "default" : "secondary"}>
              {mode === "work" ? "💼 Work" : "🏠 Personal"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Weather */}
          {weather && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{weather.condition}</span>
              <span className="font-medium text-foreground">
                {weather.temperature}
              </span>
            </div>
          )}
          
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{dateString}</span>
            <span className="font-medium text-foreground">{timeString}</span>
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </Button>
          )}

          {/* Settings */}
          {onSettingsClick && (
            <Button variant="ghost" size="sm" onClick={onSettingsClick}>
              ⚙️
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
