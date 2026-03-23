"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  exists: boolean;
  linkCount: number;
  group: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNotes: number;
    totalEdges: number;
    orphanCount: number;
    phantomCount: number;
    bridgeNotes: string[];
  };
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  exists: boolean;
  linkCount: number;
  group: string;
  x: number;
  y: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: SimNode;
  target: SimNode;
}

interface MemoryGraphProps {
  graph: GraphData;
  onNodeClick?: (slug: string) => void;
  selectedNode?: string;
  mini?: boolean;
  todaySlug?: string;
}

const TYPE_COLORS: Record<string, string> = {
  daily: "#3b82f6",      // blue
  project: "#22c55e",    // green
  user: "#a855f7",       // purple
  reference: "#f59e0b",  // amber
  moc: "#eab308",        // gold
  feedback: "#f43f5e",   // rose
  phantom: "#6b7280",    // gray
  root: "#eab308",       // gold (root files like MEMORY.md)
  unknown: "#6b7280",
};

function getNodeRadius(linkCount: number, mini: boolean): number {
  const base = mini ? 3 : 5;
  const scale = mini ? 1 : 2;
  return Math.min(base + linkCount * scale, mini ? 10 : 20);
}

export function MemoryGraph({ graph, onNodeClick, selectedNode, mini = false, todaySlug }: MemoryGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 500 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const width = mini ? 300 : 800;
  const height = mini ? 180 : 500;

  useEffect(() => {
    if (!graph.nodes.length) return;

    const nodes: SimNode[] = graph.nodes.map((n) => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = graph.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
      }));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(mini ? 30 : 60)
      )
      .force("charge", forceManyBody().strength(mini ? -30 : -80))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide<SimNode>((d) => getNodeRadius(d.linkCount, mini) + 3));

    sim.on("tick", () => {
      setSimNodes([...nodes]);
      setSimLinks([...links]);
    });

    // Run faster
    sim.alpha(1).alphaDecay(mini ? 0.05 : 0.02);

    return () => {
      sim.stop();
    };
  }, [graph, width, height, mini]);

  // Initialize viewBox
  useEffect(() => {
    setViewBox({ x: 0, y: 0, w: width, h: height });
  }, [width, height]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (mini) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      setViewBox((prev) => {
        const cx = prev.x + prev.w / 2;
        const cy = prev.y + prev.h / 2;
        const nw = prev.w * factor;
        const nh = prev.h * factor;
        return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
      });
    },
    [mini]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mini) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
    },
    [mini]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || mini) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx * scaleX,
        y: prev.y - dy * scaleY,
      }));
    },
    [mini, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="relative w-full" style={{ height: mini ? 180 : 500 }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className={`bg-background rounded-lg border ${mini ? "" : "cursor-grab active:cursor-grabbing"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Edges */}
        {simLinks.map((link, i) => (
          <line
            key={i}
            x1={link.source.x}
            y1={link.source.y}
            x2={link.target.x}
            y2={link.target.y}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={mini ? 0.5 : 1}
          />
        ))}

        {/* Nodes */}
        {simNodes.map((node) => {
          const r = getNodeRadius(node.linkCount, mini);
          const color = TYPE_COLORS[node.group] || TYPE_COLORS[node.type] || TYPE_COLORS.unknown;
          const isSelected = selectedNode === node.id;
          const isHovered = hoveredNode === node.id;
          const isToday = todaySlug === node.id;
          const isPhantom = !node.exists;
          const isBridge = graph.stats.bridgeNotes.includes(node.id);

          return (
            <g key={node.id}>
              {/* Bridge glow */}
              {isBridge && !mini && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 6}
                  fill={color}
                  opacity={0.15}
                />
              )}

              {/* Today pulse */}
              {isToday && !mini && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.5}
                >
                  <animate
                    attributeName="r"
                    values={`${r + 4};${r + 10};${r + 4}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0.1;0.5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 3}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.8}
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={isPhantom ? "transparent" : color}
                stroke={color}
                strokeWidth={isPhantom ? 1.5 : 0}
                strokeDasharray={isPhantom ? "3,2" : ""}
                opacity={isPhantom ? 0.5 : isHovered ? 1 : 0.85}
                className={mini ? "" : "cursor-pointer transition-opacity"}
                onClick={() => !mini && onNodeClick?.(node.id)}
                onMouseEnter={() => !mini && setHoveredNode(node.id)}
                onMouseLeave={() => !mini && setHoveredNode(null)}
              />

              {/* Label (only on hover or selected, not in mini mode) */}
              {!mini && (isHovered || isSelected) && (
                <text
                  x={node.x}
                  y={node.y - r - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill="currentColor"
                  className="pointer-events-none select-none"
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {!mini && hoveredNode && (
        <div className="absolute bottom-2 left-2 bg-card border rounded-md px-3 py-2 text-xs shadow-md pointer-events-none">
          {(() => {
            const node = simNodes.find((n) => n.id === hoveredNode);
            if (!node) return null;
            return (
              <>
                <div className="font-medium">{node.label}</div>
                <div className="text-muted-foreground">
                  {node.exists ? node.type : "phantom"} &middot; {node.linkCount} connections
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Legend (not in mini mode) */}
      {!mini && (
        <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm border rounded-md px-3 py-2 text-xs space-y-1">
          {Object.entries(TYPE_COLORS)
            .filter(([key]) => !["unknown", "root"].includes(key))
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: type === "phantom" ? "transparent" : color,
                    border: type === "phantom" ? `1.5px dashed ${color}` : "none",
                  }}
                />
                <span className="text-muted-foreground">{type}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
