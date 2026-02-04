"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: "high" | "medium" | "low";
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

interface KanbanData {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  lastUpdated: string;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const priorityDots: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const defaultData: KanbanData = {
  columns: [
    { id: "backlog", title: "Backlog", color: "#6b7280" },
    { id: "todo", title: "To Do", color: "#3b82f6" },
    { id: "in-progress", title: "In Progress", color: "#f59e0b" },
    { id: "review", title: "Review", color: "#8b5cf6" },
    { id: "done", title: "Done", color: "#22c55e" },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Set up PM agent system integration",
      description: "Connect pm-agent-system to clawdbot for full task delegation",
      column: "done",
      priority: "high",
      labels: ["infra", "pm"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "task-2",
      title: "Build kanban dashboard widget",
      description: "Add kanban-style task board to clawdbot-dashboard",
      column: "done",
      priority: "high",
      labels: ["dashboard", "feature"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "task-3",
      title: "Daily news briefing automation",
      description: "Automated 5:30 AM KST news delivery via WhatsApp",
      column: "todo",
      priority: "medium",
      labels: ["automation"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "task-4",
      title: "Superscribe MVP launch",
      description: "Local-first macOS Whisper AI speech-to-text app",
      column: "backlog",
      priority: "high",
      labels: ["saas", "product"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "task-5",
      title: "YouTube Analytics Tool PRD",
      description: "Product requirements doc for creator metrics platform",
      column: "backlog",
      priority: "medium",
      labels: ["saas", "product"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "task-6",
      title: "SNS automation content calendar",
      description: "Plan content across 10 SNS profiles for the week",
      column: "todo",
      priority: "medium",
      labels: ["sns", "marketing"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  lastUpdated: new Date().toISOString(),
};

export function KanbanWidget() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingTask, setMovingTask] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("kanban-board");
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        setData(defaultData);
        localStorage.setItem("kanban-board", JSON.stringify(defaultData));
      }
    } catch (err) {
      console.error("Failed to load kanban:", err);
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage
  const saveBoard = useCallback((newData: KanbanData) => {
    setData(newData);
    if (typeof window !== "undefined") {
      localStorage.setItem("kanban-board", JSON.stringify(newData));
    }
  }, []);

  const moveTask = (taskId: string, toColumn: string) => {
    if (!data) return;
    const newData = {
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === taskId
          ? { ...t, column: toColumn, updatedAt: new Date().toISOString() }
          : t
      ),
    };
    saveBoard(newData);
    setMovingTask(null);
  };

  const addTask = (column: string) => {
    if (!data || !newTitle.trim()) return;
    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      description: "",
      column,
      priority: newPriority,
      labels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newData = {
      ...data,
      tasks: [...data.tasks, newTask],
      lastUpdated: new Date().toISOString(),
    };
    saveBoard(newData);
    setNewTitle("");
    setNewPriority("medium");
    setAddingTo(null);
  };

  const deleteTask = (taskId: string) => {
    if (!data) return;
    const newData = {
      ...data,
      tasks: data.tasks.filter((t) => t.id !== taskId),
      lastUpdated: new Date().toISOString(),
    };
    saveBoard(newData);
    setExpandedTask(null);
  };

  // Drag handlers
  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (columnId: string) => {
    if (draggedTask && data) {
      moveTask(draggedTask, columnId);
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  };

  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-3">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted-foreground text-sm">Loading board...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="col-span-1 lg:col-span-3">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted-foreground text-sm">Failed to load kanban board</span>
        </CardContent>
      </Card>
    );
  }

  const getColumnTasks = (columnId: string) =>
    data.tasks.filter((t) => t.column === columnId);

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="text-lg">📋</span> Kanban Board
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {data.tasks.length} tasks
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5">
              Local Storage
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {data.columns.map((column) => {
            const tasks = getColumnTasks(column.id);
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={`flex-shrink-0 w-56 rounded-lg border transition-colors ${
                  isDragOver
                    ? "bg-primary/10 border-primary/40"
                    : "bg-muted/30"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {column.title}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {tasks.length}
                  </Badge>
                </div>

                {/* Tasks */}
                <div className="px-2 pb-2 space-y-2 min-h-[80px]">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={`p-2.5 bg-card rounded-md border shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all ${
                        draggedTask === task.id ? "opacity-40" : ""
                      }`}
                    >
                      {/* Task title & priority */}
                      <div className="flex items-start gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            priorityDots[task.priority]
                          }`}
                        />
                        <button
                          className="text-xs font-medium text-left leading-tight flex-1 hover:text-primary transition-colors"
                          onClick={() =>
                            setExpandedTask(
                              expandedTask === task.id ? null : task.id
                            )
                          }
                        >
                          {task.title}
                        </button>
                      </div>

                      {/* Labels */}
                      {task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-3.5">
                          {task.labels.map((label) => (
                            <span
                              key={label}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded details */}
                      {expandedTask === task.id && (
                        <div className="mt-2 ml-3.5 space-y-2">
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <Badge
                              className={`text-[9px] px-1 border ${
                                priorityColors[task.priority]
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          </div>

                          {/* Move buttons */}
                          {movingTask === task.id ? (
                            <div className="flex flex-wrap gap-1">
                              {data.columns
                                .filter((c) => c.id !== task.column)
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => moveTask(task.id, c.id)}
                                    className="text-[9px] px-1.5 py-0.5 rounded border hover:bg-primary/10 transition-colors"
                                  >
                                    → {c.title}
                                  </button>
                                ))}
                              <button
                                onClick={() => setMovingTask(null)}
                                className="text-[9px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground"
                              >
                                cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => setMovingTask(task.id)}
                                className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                move
                              </button>
                              <span className="text-[9px] text-muted-foreground">
                                ·
                              </span>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-[9px] text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add task */}
                  {addingTo === column.id ? (
                    <div className="p-2 bg-card rounded-md border space-y-2">
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addTask(column.id);
                          if (e.key === "Escape") setAddingTo(null);
                        }}
                        className="w-full text-xs bg-transparent border-b border-border pb-1 outline-none focus:border-primary placeholder:text-muted-foreground"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        {(["high", "medium", "low"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setNewPriority(p)}
                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                              newPriority === p
                                ? priorityColors[p]
                                : "text-muted-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-5 text-[10px] px-2"
                          onClick={() => addTask(column.id)}
                        >
                          Add
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-2"
                          onClick={() => {
                            setAddingTo(null);
                            setNewTitle("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(column.id)}
                      className="w-full text-[10px] text-muted-foreground hover:text-foreground py-1.5 rounded border border-dashed border-transparent hover:border-border transition-colors"
                    >
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
