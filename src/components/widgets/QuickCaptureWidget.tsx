"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

interface QuickCaptureWidgetProps {
  onCapture?: (text: string, type: "note" | "task" | "idea") => void;
}

export function QuickCaptureWidget({ onCapture }: QuickCaptureWidgetProps) {
  const [text, setText] = useState("");
  const [type, setType] = useState<"note" | "task" | "idea">("note");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setIsSaving(true);
    try {
      if (onCapture) {
        await onCapture(text, type);
      } else {
        // Default: send to API
        await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, type }),
        });
      }
      setText("");
      setIsExpanded(false);
    } catch (error) {
      console.error("Failed to capture:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsExpanded(false);
      setText("");
    }
  };

  if (!isExpanded) {
    return (
      <Card
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <p className="text-2xl mb-2">✏️</p>
            <p className="text-sm">Quick Capture</p>
            <p className="text-xs mt-1">Click to add a note, task, or idea</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          ✏️ Quick Capture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Type selector */}
          <div className="flex gap-2">
            {(["note", "task", "idea"] as const).map((t) => (
              <Button
                key={t}
                variant={type === t ? "default" : "outline"}
                size="sm"
                onClick={() => setType(t)}
                className="flex-1"
              >
                {t === "note" && "📝"}
                {t === "task" && "☑️"}
                {t === "idea" && "💡"}
                <span className="ml-1 capitalize">{t}</span>
              </Button>
            ))}
          </div>

          {/* Input */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              type === "note"
                ? "Write a note..."
                : type === "task"
                ? "Add a task..."
                : "Capture an idea..."
            }
            className="w-full h-24 p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">⌘+Enter to save</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpanded(false);
                  setText("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!text.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
