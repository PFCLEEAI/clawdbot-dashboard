"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";

interface Command {
  id: string;
  name: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  action: () => void | Promise<void>;
  category?: string;
}

interface CommandPaletteProps {
  commands: Command[];
}

export function CommandPalette({ commands }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on search
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || "Actions";
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    },
    [filteredCommands, selectedIndex]
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-40"
        title="Command Palette (⌘K)"
      >
        ⌘
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-background border rounded-xl shadow-2xl z-50 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-4">
          <span className="text-muted-foreground mr-2">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 py-4 text-sm bg-transparent outline-none"
          />
          <Badge variant="outline" className="text-xs">
            esc
          </Badge>
        </div>

        {/* Commands list */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="mb-2">
              <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wide">
                {category}
              </p>
              {cmds.map((cmd, idx) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    {cmd.icon && <span className="text-lg">{cmd.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cmd.name}</p>
                      {cmd.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {cmd.description}
                        </p>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <Badge variant="secondary" className="text-xs">
                        {cmd.shortcut}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No commands found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>⌘K to open</span>
        </div>
      </div>
    </>
  );
}
