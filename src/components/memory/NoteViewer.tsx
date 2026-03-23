"use client";

import { Badge } from "@/components/ui/badge";

interface MemoryNote {
  slug: string;
  path: string;
  title: string;
  type: string;
  tags: string[];
  date?: string;
  content: string;
  outlinks: string[];
  excerpt: string;
  updated?: string;
}

interface Backlink {
  slug: string;
  title: string;
  type: string;
  context: string;
}

interface NoteViewerProps {
  note: MemoryNote | null;
  backlinks: Backlink[];
  onWikilinkClick: (slug: string) => void;
  allSlugs?: string[];
}

const TYPE_COLORS: Record<string, string> = {
  daily: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  project: "bg-green-500/10 text-green-500 border-green-500/20",
  user: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  reference: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  moc: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  feedback: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

function renderMarkdown(
  content: string,
  onWikilinkClick: (slug: string) => void,
  allSlugs: string[]
): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-muted rounded-md p-3 text-xs overflow-x-auto my-2">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Comments
    if (line.trim().startsWith("<!--")) continue;

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes: Record<number, string> = {
        1: "text-xl font-bold mt-4 mb-2",
        2: "text-lg font-semibold mt-3 mb-1.5",
        3: "text-base font-semibold mt-2 mb-1",
        4: "text-sm font-semibold mt-2 mb-1",
        5: "text-sm font-medium mt-1",
        6: "text-xs font-medium mt-1",
      };
      const className = sizes[level] || sizes[4];
      if (level === 1) elements.push(<h1 key={i} className={className}>{renderInline(text, onWikilinkClick, allSlugs)}</h1>);
      else if (level === 2) elements.push(<h2 key={i} className={className}>{renderInline(text, onWikilinkClick, allSlugs)}</h2>);
      else if (level === 3) elements.push(<h3 key={i} className={className}>{renderInline(text, onWikilinkClick, allSlugs)}</h3>);
      else if (level === 4) elements.push(<h4 key={i} className={className}>{renderInline(text, onWikilinkClick, allSlugs)}</h4>);
      else if (level === 5) elements.push(<h5 key={i} className={className}>{renderInline(text, onWikilinkClick, allSlugs)}</h5>);
      else elements.push(<h6 key={i} className={className}>{renderInline(text, onWikilinkClick, allSlugs)}</h6>);
      continue;
    }

    // Checkbox items
    const checkMatch = line.match(/^(\s*)- \[([ xX])\]\s*(.+)$/);
    if (checkMatch) {
      const checked = checkMatch[2] !== " ";
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
          <span className={`mt-0.5 ${checked ? "text-green-500" : "text-muted-foreground"}`}>
            {checked ? "✓" : "○"}
          </span>
          <span className={checked ? "line-through text-muted-foreground" : ""}>
            {renderInline(checkMatch[3], onWikilinkClick, allSlugs)}
          </span>
        </div>
      );
      continue;
    }

    // List items
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2);
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5" style={{ marginLeft: indent * 16 + 8 }}>
          <span className="text-muted-foreground mt-1 text-xs">•</span>
          <span>{renderInline(listMatch[2], onWikilinkClick, allSlugs)}</span>
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="border-border my-3" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-1">
        {renderInline(line, onWikilinkClick, allSlugs)}
      </p>
    );
  }

  return elements;
}

function renderInline(
  text: string,
  onWikilinkClick: (slug: string) => void,
  allSlugs: string[]
): React.ReactNode {
  // Split on wikilinks, bold, italic, inline code
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Wikilink: [[target|display]] or [[target]]
    const wikiMatch = remaining.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (wikiMatch && wikiMatch.index !== undefined) {
      // Text before the match
      if (wikiMatch.index > 0) {
        parts.push(
          <span key={key++}>{formatInlineText(remaining.slice(0, wikiMatch.index))}</span>
        );
      }

      const target = wikiMatch[1].trim();
      const display = wikiMatch[2]?.trim() || target;
      const targetSlug = target.toLowerCase();
      const exists = allSlugs.includes(targetSlug);

      parts.push(
        <button
          key={key++}
          onClick={() => onWikilinkClick(targetSlug)}
          className={`inline-flex items-center gap-0.5 ${
            exists
              ? "text-blue-500 hover:text-blue-400 underline decoration-blue-500/30 hover:decoration-blue-400"
              : "text-muted-foreground hover:text-foreground underline decoration-dotted decoration-muted-foreground/40"
          } transition-colors`}
          title={exists ? target : `${target} (not created yet)`}
        >
          {display}
          {!exists && <span className="text-xs opacity-50">*</span>}
        </button>
      );

      remaining = remaining.slice(wikiMatch.index + wikiMatch[0].length);
      continue;
    }

    // No more wikilinks
    parts.push(<span key={key++}>{formatInlineText(remaining)}</span>);
    break;
  }

  return <>{parts}</>;
}

function formatInlineText(text: string): React.ReactNode {
  // Handle **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/\*(.+?)\*/);

    // Find earliest match
    const matches = [
      codeMatch ? { match: codeMatch, type: "code" as const } : null,
      boldMatch ? { match: boldMatch, type: "bold" as const } : null,
      italicMatch && (!boldMatch || (italicMatch.index || 0) < (boldMatch.index || 0))
        ? { match: italicMatch, type: "italic" as const }
        : null,
    ]
      .filter(Boolean)
      .sort((a, b) => (a!.match.index || 0) - (b!.match.index || 0));

    if (matches.length > 0) {
      const { match, type } = matches[0]!;
      const idx = match.index || 0;

      if (idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      }

      if (type === "code") {
        parts.push(
          <code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {match[1]}
          </code>
        );
      } else if (type === "bold") {
        parts.push(<strong key={key++}>{match[1]}</strong>);
      } else {
        parts.push(<em key={key++}>{match[1]}</em>);
      }

      remaining = remaining.slice(idx + match[0].length);
      continue;
    }

    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}

export function NoteViewer({ note, backlinks, onWikilinkClick, allSlugs = [] }: NoteViewerProps) {
  if (!note) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-2xl mb-2">📝</p>
          <p>Select a note to view</p>
        </div>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[note.type] || "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Frontmatter badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={typeColor}>{note.type}</Badge>
        {note.date && (
          <Badge variant="outline" className="text-xs">
            {note.date}
          </Badge>
        )}
        {note.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            #{tag}
          </Badge>
        ))}
        {note.path && (
          <span className="text-xs text-muted-foreground ml-auto">{note.path}</span>
        )}
      </div>

      {/* Content */}
      <div className="prose-sm max-w-none text-sm leading-relaxed">
        {renderMarkdown(note.content, onWikilinkClick, allSlugs)}
      </div>

      {/* Backlinks panel */}
      {backlinks.length > 0 && (
        <div className="border-t pt-4 mt-6">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            {backlinks.length} backlink{backlinks.length !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {backlinks.map((bl) => (
              <button
                key={bl.slug}
                onClick={() => onWikilinkClick(bl.slug)}
                className="w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${TYPE_COLORS[bl.type] || ""}`}>{bl.type}</Badge>
                  <span className="text-sm font-medium text-blue-500">{bl.title}</span>
                </div>
                {bl.context && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{bl.context}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outlinks */}
      {note.outlinks.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            {note.outlinks.length} outgoing link{note.outlinks.length !== 1 ? "s" : ""}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {note.outlinks.map((link) => {
              const exists = allSlugs.includes(link);
              return (
                <button
                  key={link}
                  onClick={() => onWikilinkClick(link)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    exists
                      ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-dashed border-muted-foreground/30"
                  }`}
                >
                  {link}
                  {!exists && <span className="ml-0.5 opacity-50">*</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
