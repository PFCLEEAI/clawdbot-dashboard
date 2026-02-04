import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

export const dynamic = "force-dynamic";

const KANBAN_PATH = join(homedir(), "clawd/projects/kanban.json");

function ensureKanbanFile() {
  if (!existsSync(KANBAN_PATH)) {
    const dir = dirname(KANBAN_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const defaultData = {
      columns: [
        { id: "backlog", title: "Backlog", color: "#6b7280" },
        { id: "todo", title: "To Do", color: "#3b82f6" },
        { id: "in-progress", title: "In Progress", color: "#f59e0b" },
        { id: "review", title: "Review", color: "#8b5cf6" },
        { id: "done", title: "Done", color: "#22c55e" },
      ],
      tasks: [],
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(KANBAN_PATH, JSON.stringify(defaultData, null, 2));
  }
}

function readKanban() {
  ensureKanbanFile();
  return JSON.parse(readFileSync(KANBAN_PATH, "utf-8"));
}

function writeKanban(data: Record<string, unknown>) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(KANBAN_PATH, JSON.stringify(data, null, 2));
}

// GET - Read kanban board
export async function GET() {
  try {
    const data = readKanban();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Kanban GET error:", error);
    return NextResponse.json(
      { error: "Failed to read kanban board" },
      { status: 500 }
    );
  }
}

// POST - Add task or move task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const data = readKanban();

    if (action === "add") {
      const { title, description, column, priority, labels } = body;
      if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      const newTask = {
        id: `task-${Date.now()}`,
        title,
        description: description || "",
        column: column || "backlog",
        priority: priority || "medium",
        labels: labels || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.tasks.push(newTask);
      writeKanban(data);
      return NextResponse.json({ success: true, task: newTask });
    }

    if (action === "move") {
      const { taskId, toColumn } = body;
      const task = data.tasks.find((t: { id: string }) => t.id === taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      task.column = toColumn;
      task.updatedAt = new Date().toISOString();
      writeKanban(data);
      return NextResponse.json({ success: true, task });
    }

    if (action === "update") {
      const { taskId, ...updates } = body;
      const task = data.tasks.find((t: { id: string }) => t.id === taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.description !== undefined) task.description = updates.description;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.labels !== undefined) task.labels = updates.labels;
      if (updates.column !== undefined) task.column = updates.column;
      task.updatedAt = new Date().toISOString();
      writeKanban(data);
      return NextResponse.json({ success: true, task });
    }

    if (action === "delete") {
      const { taskId } = body;
      data.tasks = data.tasks.filter((t: { id: string }) => t.id !== taskId);
      writeKanban(data);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Kanban POST error:", error);
    return NextResponse.json(
      { error: "Failed to update kanban board" },
      { status: 500 }
    );
  }
}
