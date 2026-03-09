"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: "high" | "medium" | "low";
  labels: string[];
  dueDate?: string;
  assignee?: string;
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
      title: "Build kanban dashboard",
      description: "Full-page kanban project management board",
      column: "done",
      priority: "high",
      labels: ["dashboard", "feature"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "task-3",
      title: "SaaS Ideas validation system",
      description: "Track and validate SaaS opportunities from Reddit",
      column: "done",
      priority: "high",
      labels: ["saas", "feature"],
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
      title: "Reddit engagement automation",
      description: "Automated posting and engagement across 10 profiles",
      column: "in-progress",
      priority: "medium",
      labels: ["automation", "sns"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  lastUpdated: new Date().toISOString(),
};

export default function KanbanPage() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    labels: "",
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kanban-board");
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        setData(defaultData);
        localStorage.setItem("kanban-board", JSON.stringify(defaultData));
      }
    } catch (err) {
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage
  const saveBoard = useCallback((newData: KanbanData) => {
    setData(newData);
    localStorage.setItem("kanban-board", JSON.stringify(newData));
  }, []);

  const moveTask = (taskId: string, toColumn: string) => {
    if (!data) return;
    const newData = {
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === taskId ? { ...t, column: toColumn, updatedAt: new Date().toISOString() } : t
      ),
      lastUpdated: new Date().toISOString(),
    };
    saveBoard(newData);
  };

  const addTask = (column: string) => {
    if (!data || !newTask.title.trim()) return;
    const task: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      column,
      priority: newTask.priority,
      labels: newTask.labels.split(",").map((l) => l.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveBoard({
      ...data,
      tasks: [...data.tasks, task],
      lastUpdated: new Date().toISOString(),
    });
    setNewTask({ title: "", description: "", priority: "medium", labels: "" });
    setAddingTo(null);
  };

  const updateTask = (taskId: string, updates: Partial<KanbanTask>) => {
    if (!data) return;
    saveBoard({
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
      lastUpdated: new Date().toISOString(),
    });
  };

  const deleteTask = (taskId: string) => {
    if (!data) return;
    saveBoard({
      ...data,
      tasks: data.tasks.filter((t) => t.id !== taskId),
      lastUpdated: new Date().toISOString(),
    });
    setEditingTask(null);
  };

  // Drag handlers
  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };
  const handleDragLeave = () => setDragOverColumn(null);
  const handleDrop = (columnId: string) => {
    if (draggedTask) {
      moveTask(draggedTask, columnId);
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-4xl animate-bounce">📋</span>
      </div>
    );
  }

  if (!data) return null;

  const getColumnTasks = (columnId: string) => data.tasks.filter((t) => t.column === columnId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold">📋 Project Board</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{data.tasks.length} tasks</span>
              <span>•</span>
              <span>{data.tasks.filter((t) => t.column === "done").length} completed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {data.columns.map((column) => {
            const tasks = getColumnTasks(column.id);
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={`w-80 flex-shrink-0 rounded-lg border transition-colors ${
                  isDragOver ? "bg-primary/10 border-primary/40" : "bg-muted/30"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-semibold">{column.title}</span>
                  </div>
                  <Badge variant="secondary">{tasks.length}</Badge>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onClick={() => setEditingTask(task)}
                      className={`p-4 bg-card rounded-lg border shadow-sm cursor-pointer hover:border-primary/50 transition-all ${
                        draggedTask === task.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-2 ${priorityDots[task.priority]}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{task.title}</h3>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.labels.map((label) => (
                                <span
                                  key={label}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Task Button */}
                  {addingTo === column.id ? (
                    <div className="p-4 bg-card rounded-lg border space-y-3">
                      <input
                        type="text"
                        placeholder="Task title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded border bg-background"
                        autoFocus
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded border bg-background h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        {(["high", "medium", "low"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setNewTask({ ...newTask, priority: p })}
                            className={`text-xs px-2 py-1 rounded border ${
                              newTask.priority === p ? priorityColors[p] : ""
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Labels (comma separated)"
                        value={newTask.labels}
                        onChange={(e) => setNewTask({ ...newTask, labels: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded border bg-background"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => addTask(column.id)}>
                          Add Task
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddingTo(null);
                            setNewTask({ title: "", description: "", priority: "medium", labels: "" });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(column.id)}
                      className="w-full py-3 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary/50 transition-colors"
                    >
                      + Add Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">Edit Task</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingTask(null)}>
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded border bg-background"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded border bg-background h-24 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Priority</label>
                <div className="flex gap-2 mt-1">
                  {(["high", "medium", "low"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditingTask({ ...editingTask, priority: p })}
                      className={`text-sm px-3 py-1 rounded border ${
                        editingTask.priority === p ? priorityColors[p] : ""
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <select
                  value={editingTask.column}
                  onChange={(e) => setEditingTask({ ...editingTask, column: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded border bg-background"
                >
                  {data.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Labels</label>
                <input
                  type="text"
                  value={editingTask.labels.join(", ")}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      labels: e.target.value.split(",").map((l) => l.trim()).filter(Boolean),
                    })
                  }
                  className="w-full mt-1 px-3 py-2 rounded border bg-background"
                  placeholder="Comma separated labels"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    updateTask(editingTask.id, editingTask);
                    setEditingTask(null);
                  }}
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="ml-auto"
                  onClick={() => deleteTask(editingTask.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
