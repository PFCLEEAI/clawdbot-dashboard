import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  
  const imagePath = join(homedir(), `.clawdbot/tmp/newspaper-${date}.png`);
  
  if (!existsSync(imagePath)) {
    return NextResponse.json(
      { error: "Newspaper not found for this date" },
      { status: 404 }
    );
  }
  
  try {
    const imageBuffer = await readFile(imagePath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading newspaper image:", error);
    return NextResponse.json(
      { error: "Failed to read newspaper image" },
      { status: 500 }
    );
  }
}
