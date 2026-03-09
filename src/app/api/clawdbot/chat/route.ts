import { NextResponse } from "next/server";
import { chatWithClawdbot } from "@/lib/clawdbot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
    const result = await chatWithClawdbot(message);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}
