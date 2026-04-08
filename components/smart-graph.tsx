"use client";

import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type ReactNode,
  useEffect,
} from "react";
import {
  Users,
  Award,
  Target,
  Layers,
  ArrowLeftRight,
  GripVertical,
  X,
  ChevronDown,
  ChevronRight,
  Network,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

/* ── Types ─────────────────────────────────────────── */

type DimensionKey = "person" | "brand" | "lead_source" | "condition" | "channel";

type DimensionDef = {
  key: DimensionKey;
  label: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
};

type GraphNode = {
  id: string;
  name: string;
  gp: number;
  revenue: number;
  units: number;
  margin: number;
  dimension: DimensionKey;
  children: GraphNode[];
  expanded: boolean;
  loading: boolean;
  filters: Record<string, string>;
};

/* ── Dimension palette ─────────────────────────────── */

const ALL_DIMENSIONS: DimensionDef[] = [
  {
    key: "person",
    label: "Person",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    dotColor: "bg-blue-500",
  },
  {
    key: "brand",
    label: "Brand",
    icon: <Award className="h-4 w-4" />,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    dotColor: "bg-amber-500",
  },
  {
    key: "lead_source",
    label: "Lead Source",
    icon: <Target className="h-4 w-4" />,
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    dotColor: "bg-green-500",
  },
  {
    key: "condition",
    label: "Condition",
    icon: <Layers className="h-4 w-4" />,
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    dotColor: "bg-purple-500",
  },
  {
    key: "channel",
    label: "Channel",
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-300",
    dotColor: "bg-sky-500",
  },
];

const dimMap = new Map(ALL_DIMENSIONS.map((d) => [d.key, d]));

/* ── Main Component ───────────────────────────────── */

export function SmartGraph({ year: initialYear }: { year: number }) {
  const [year, setYear] = useState(initialYear);
  const [pipeline, setPipeline] = useState<DimensionKey[]>([]);
  const [rootNodes, setRootNodes] = useState<GraphNode[]>([]);
  const [rootLoading, setRootLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const available = ALL_DIMENSIONS.filter((d) => !pipeline.includes(d.key));

  /* ── Fetch nodes from API ─────────────────────── */
  const fetchNodes = useCallback(
    async (dims: DimensionKey[], filters: Record<string, string>) => {
      const res = await fetch(
        `/api/smart-graph?year=${year}&dimensions=${dims.join(",")}&filters=${encodeURIComponent(JSON.stringify(filters))}`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.nodes ?? []) as {
        id: string;
        name: string;
        gp: number;
        revenue: number;
        units: number;
        margin: number;
      }[];
    },
    [year],
  );

  /* ── Load root level when pipeline changes ─── */
  const loadRoot = useCallback(
    async (dims: DimensionKey[]) => {
      if (dims.length === 0) {
        setRootNodes([]);
        return;
      }
      setRootLoading(true);
      try {
        const nodes = await fetchNodes(dims, {});
        setRootNodes(
          nodes.map((n) => ({
            ...n,
            dimension: dims[0],
            children: [],
            expanded: false,
            loading: false,
            filters: { [dims[0]]: n.id },
          })),
        );
      } finally {
        setRootLoading(false);
      }
    },
    [fetchNodes],
  );

  /* ── Expand / collapse a node ──────────────── */
  const toggleNode = useCallback(
    async (path: number[]) => {
      const updateTree = (
        nodes: GraphNode[],
        depth: number,
      ): GraphNode[] => {
        return nodes.map((node, i) => {
          if (i !== path[depth]) return node;
          if (depth === path.length - 1) {
            // Toggle this node
            if (node.expanded) {
              return { ...node, expanded: false };
            }
            return { ...node, loading: true };
          }
          return { ...node, children: updateTree(node.children, depth + 1) };
        });
      };

      // First mark as loading
      setRootNodes((prev) => updateTree(prev, 0));

      // Find the target node
      let targetNode: GraphNode | undefined;
      let current = rootNodes;
      for (const idx of path) {
        targetNode = current[idx];
        if (!targetNode) return;
        current = targetNode.children;
      }

      if (!targetNode) return;

      if (targetNode.expanded) {
        // Already expanded, just collapse
        return;
      }

      // Determine the next dimension
      const currentDimIdx = pipeline.indexOf(targetNode.dimension);
      const nextDim = pipeline[currentDimIdx + 1];
      if (!nextDim) {
        // No more dimensions to drill
        setRootNodes((prev) => {
          const markDone = (nodes: GraphNode[], depth: number): GraphNode[] =>
            nodes.map((n, i) =>
              i !== path[depth]
                ? n
                : depth === path.length - 1
                  ? { ...n, loading: false, expanded: true }
                  : { ...n, children: markDone(n.children, depth + 1) },
            );
          return markDone(prev, 0);
        });
        return;
      }

      // Fetch children
      const childData = await fetchNodes(pipeline, targetNode.filters);
      const children: GraphNode[] = childData.map((c) => ({
        ...c,
        dimension: nextDim,
        children: [],
        expanded: false,
        loading: false,
        filters: { ...targetNode!.filters, [nextDim]: c.id },
      }));

      setRootNodes((prev) => {
        const inject = (nodes: GraphNode[], depth: number): GraphNode[] =>
          nodes.map((n, i) =>
            i !== path[depth]
              ? n
              : depth === path.length - 1
                ? { ...n, loading: false, expanded: true, children }
                : { ...n, children: inject(n.children, depth + 1) },
          );
        return inject(prev, 0);
      });
    },
    [rootNodes, pipeline, fetchNodes],
  );

  /* ── Drag handlers ──────────────────────────── */
  const onDragStart = (e: DragEvent, key: DimensionKey) => {
    e.dataTransfer.setData("dimension", key);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOverDrop = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const onDragLeaveDrop = () => setDragOver(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDragOverIdx(null);
    const key = e.dataTransfer.getData("dimension") as DimensionKey;
    if (!key || pipeline.includes(key)) return;
    const next = [...pipeline, key];
    setPipeline(next);
    loadRoot(next);
  };

  /* ── Pipeline reorder via drag ─────────────── */
  const onPipeDragStart = (e: DragEvent, idx: number) => {
    e.dataTransfer.setData("pipe-idx", String(idx));
    e.dataTransfer.effectAllowed = "move";
  };
  const onPipeDragOver = (e: DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const onPipeDrop = (e: DragEvent, dropIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);

    // Handle drop from palette
    const dimKey = e.dataTransfer.getData("dimension") as DimensionKey;
    if (dimKey && !pipeline.includes(dimKey)) {
      const next = [...pipeline];
      next.splice(dropIdx, 0, dimKey);
      setPipeline(next);
      loadRoot(next);
      return;
    }

    const fromIdx = Number(e.dataTransfer.getData("pipe-idx"));
    if (isNaN(fromIdx) || fromIdx === dropIdx) return;
    const next = [...pipeline];
    const [item] = next.splice(fromIdx, 1);
    next.splice(dropIdx, 0, item);
    setPipeline(next);
    loadRoot(next);
  };

  const removeDim = (idx: number) => {
    const next = pipeline.filter((_, i) => i !== idx);
    setPipeline(next);
    loadRoot(next);
  };

  const clearAll = () => {
    setPipeline([]);
    setRootNodes([]);
  };

  /* ── Year change ────────────────────────────── */
  const handleYearChange = (y: number) => {
    setYear(y);
  };

  useEffect(() => {
    if (pipeline.length > 0) loadRoot(pipeline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-indigo-600" />
            Smart Graph
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag dimensions from the left and drop them to build your drill-down tree
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm bg-white"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {pipeline.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* ── Left Panel: Dimension Palette ───── */}
        <div className="w-56 shrink-0 space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
              Dimensions
            </p>
            <div className="space-y-2">
              {available.map((dim) => (
                <div
                  key={dim.key}
                  draggable
                  onDragStart={(e) => onDragStart(e, dim.key)}
                  className={`flex cursor-grab items-center gap-2 rounded-lg border ${dim.borderColor} ${dim.bgColor} px-3 py-2 text-sm font-medium ${dim.color} transition-all hover:shadow-md active:cursor-grabbing active:shadow-lg`}
                >
                  <GripVertical className="h-3.5 w-3.5 opacity-40" />
                  {dim.icon}
                  <span>{dim.label}</span>
                </div>
              ))}
              {available.length === 0 && (
                <p className="text-xs text-zinc-400 italic">All dimensions used</p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              How to use
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-500">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-indigo-500">1.</span>
                Drag a dimension to the drop zone
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-indigo-500">2.</span>
                Add more dimensions for deeper drill
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-indigo-500">3.</span>
                Click nodes to expand children
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-indigo-500">4.</span>
                Reorder pipeline chips to change hierarchy
              </li>
            </ul>
          </div>
        </div>

        {/* ── Right Panel: Graph Canvas ───────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Pipeline bar */}
          <div
            ref={dropRef}
            onDragOver={onDragOverDrop}
            onDragLeave={onDragLeaveDrop}
            onDrop={onDrop}
            className={`mb-4 flex min-h-[52px] items-center gap-2 rounded-xl border-2 border-dashed px-4 py-2 transition-colors ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : pipeline.length > 0
                  ? "border-zinc-300 bg-white"
                  : "border-zinc-300 bg-zinc-50"
            }`}
          >
            {pipeline.length === 0 && (
              <span className="text-sm text-zinc-400 italic">
                Drop dimensions here to build your hierarchy &hellip;
              </span>
            )}
            {pipeline.map((key, idx) => {
              const dim = dimMap.get(key)!;
              return (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => onPipeDragStart(e, idx)}
                  onDragOver={(e) => onPipeDragOver(e, idx)}
                  onDrop={(e) => onPipeDrop(e, idx)}
                  className={`flex items-center gap-1.5 rounded-lg border ${dim.borderColor} ${dim.bgColor} px-2.5 py-1 text-xs font-semibold ${dim.color} cursor-grab transition-all ${
                    dragOverIdx === idx ? "ring-2 ring-indigo-400 ring-offset-1" : ""
                  }`}
                >
                  <GripVertical className="h-3 w-3 opacity-40" />
                  {dim.icon}
                  <span>{dim.label}</span>
                  <button
                    onClick={() => removeDim(idx)}
                    className="ml-1 rounded p-0.5 hover:bg-black/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {idx < pipeline.length - 1 && (
                    <span className="ml-1 text-zinc-300">&rarr;</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tree area */}
          <div className="flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            {pipeline.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-zinc-400">
                <Network className="h-16 w-16 mb-3 opacity-30" />
                <p className="text-lg font-medium">Build Your Mind Map</p>
                <p className="text-sm mt-1">
                  Drag dimensions from the left panel to start
                </p>
              </div>
            ) : rootLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-1">
                {/* Root label */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Network className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-zinc-700">
                    All Sales ({year})
                  </span>
                </div>
                {/* Tree nodes */}
                <div className="ml-4 border-l-2 border-zinc-200 pl-4">
                  {rootNodes.map((node, i) => (
                    <TreeNode
                      key={node.id}
                      node={node}
                      path={[i]}
                      pipeline={pipeline}
                      onToggle={toggleNode}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Recursive Tree Node ──────────────────────────── */

function TreeNode({
  node,
  path,
  pipeline,
  onToggle,
}: {
  node: GraphNode;
  path: number[];
  pipeline: DimensionKey[];
  onToggle: (path: number[]) => void;
}) {
  const dim = dimMap.get(node.dimension);
  const dimIdx = pipeline.indexOf(node.dimension);
  const hasMoreDimensions = dimIdx < pipeline.length - 1;

  // GP-based intensity for visual weight
  const maxGpSibling = 1; // Normalization is handled via opacity

  return (
    <div className="py-0.5">
      <button
        onClick={() => onToggle(path)}
        className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all hover:bg-zinc-50 ${
          node.expanded ? "bg-zinc-50" : ""
        }`}
      >
        {/* Expand/collapse icon */}
        {hasMoreDimensions ? (
          node.loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent shrink-0" />
          ) : node.expanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
          )
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${dim?.dotColor ?? "bg-zinc-400"} shrink-0`} />
        )}

        {/* Name badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
            dim?.borderColor ?? "border-zinc-300"
          } ${dim?.bgColor ?? "bg-zinc-50"} ${dim?.color ?? "text-zinc-700"}`}
        >
          {dim?.icon}
          {node.name}
        </span>

        {/* Metrics */}
        <span className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-700">
            {formatCurrency(node.gp)}
          </span>
          <span className="hidden sm:inline">
            {node.units} units
          </span>
          <span className="hidden md:inline text-zinc-400">
            {formatPercent(node.margin)}
          </span>
        </span>
      </button>

      {/* Children */}
      {node.expanded && node.children.length > 0 && (
        <div className="ml-5 border-l-2 border-zinc-100 pl-4">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              path={[...path, i]}
              pipeline={pipeline}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {node.expanded && node.children.length === 0 && !node.loading && (
        <div className="ml-10 py-1 text-xs text-zinc-400 italic">
          {hasMoreDimensions ? "No data at this level" : "Leaf node — fully drilled"}
        </div>
      )}
    </div>
  );
}
