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
  RotateCcw,
  TrendingUp,
  ListFilter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Image from "next/image";
import { formatCurrency, formatPercent } from "@/lib/format";
import { BrandIcon } from "@/components/brand-icon";
import { UserAvatar } from "@/components/user-avatar";

/* ── Sale detail column definitions ──────────────── */

type DetailColumnKey = "brand" | "reference" | "stock_number" | "sold_for" | "profit" | "date";

const DETAIL_COLUMNS: { key: DetailColumnKey; label: string; defaultOn: boolean }[] = [
  { key: "brand", label: "Brand", defaultOn: true },
  { key: "reference", label: "Reference", defaultOn: true },
  { key: "stock_number", label: "Stock #", defaultOn: true },
  { key: "sold_for", label: "Sold For", defaultOn: true },
  { key: "profit", label: "Profit", defaultOn: true },
  { key: "date", label: "Date", defaultOn: true },
];

type SortDir = "asc" | "desc";

type SortableKey = "name" | "gp" | "units" | "margin" | "brand" | "reference" | "stock_number" | "sold_for" | "profit" | "date";

const NODE_SORT_OPTIONS: { key: SortableKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "gp", label: "Gross Profit" },
  { key: "units", label: "Units" },
  { key: "margin", label: "Margin" },
];

const DETAIL_SORT_OPTIONS: { key: SortableKey; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "reference", label: "Reference" },
  { key: "stock_number", label: "Stock #" },
  { key: "sold_for", label: "Sold For" },
  { key: "profit", label: "Profit" },
  { key: "date", label: "Date" },
];

type SortConfig = { key: SortableKey; dir: SortDir } | null;

const isNodeSortKey = (key: SortableKey) => ["name", "gp", "units", "margin"].includes(key);

function sortNodes(nodes: GraphNode[], config: SortConfig): GraphNode[] {
  if (!config || !isNodeSortKey(config.key)) return nodes;
  return [...nodes].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (config.key === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (config.key === "gp") { av = a.gp; bv = b.gp; }
    else if (config.key === "units") { av = a.units; bv = b.units; }
    else { av = a.margin; bv = b.margin; }
    if (av < bv) return config.dir === "asc" ? -1 : 1;
    if (av > bv) return config.dir === "asc" ? 1 : -1;
    return 0;
  });
}

function sortDetails(details: SaleDetail[], config: SortConfig): SaleDetail[] {
  if (!config || isNodeSortKey(config.key)) return details;
  return [...details].sort((a, b) => {
    const { key, dir } = config;
    let av: string | number, bv: string | number;
    if (key === "sold_for") { av = a.sold_for; bv = b.sold_for; }
    else if (key === "profit") { av = a.profit; bv = b.profit; }
    else if (key === "date") { av = a.date_out; bv = b.date_out; }
    else if (key === "brand") { av = (a.brand ?? "").toLowerCase(); bv = (b.brand ?? "").toLowerCase(); }
    else if (key === "reference") { av = (a.reference ?? "").toLowerCase(); bv = (b.reference ?? "").toLowerCase(); }
    else { av = (a.stock_number ?? "").toLowerCase(); bv = (b.stock_number ?? "").toLowerCase(); }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

/* ── Types ─────────────────────────────────────────── */

type DimensionKey = "person" | "brand" | "lead_source" | "condition" | "channel" | "inventory_tier" | "month";

type DimensionDef = {
  key: DimensionKey;
  label: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
};

type SaleDetail = {
  id: string;
  brand: string | null;
  reference: string | null;
  stock_number: string | null;
  sold_for: number;
  profit: number;
  date_out: string;
};

type GraphNode = {
  id: string;
  name: string;
  gp: number;
  revenue: number;
  units: number;
  margin: number;
  avatarUrl?: string | null;
  dimension: DimensionKey;
  children: GraphNode[];
  expanded: boolean;
  loading: boolean;
  filters: Record<string, string>;
  saleDetails?: SaleDetail[];
};

type SvgLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

/* ── Dimension palette ─────────────────────────────── */

const ALL_DIMENSIONS: DimensionDef[] = [
  {
    key: "person",
    label: "Associate",
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
  {
    key: "inventory_tier",
    label: "Inventory",
    icon: <Layers className="h-4 w-4" />,
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    dotColor: "bg-rose-500",
  },
  {
    key: "month",
    label: "Performance",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-300",
    dotColor: "bg-indigo-500",
  },
];

const dimMap = new Map(ALL_DIMENSIONS.map((d) => [d.key, d]));

/* ── Branch colors for connecting lines (rainbow) ─── */

const BRANCH_COLORS = [
  "#3b82f6", // blue
  "#ec4899", // pink
  "#ef4444", // red
  "#f59e0b", // amber
  "#22c55e", // green
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
];

/* ── Main Component ───────────────────────────────── */

export function SmartGraph({ year: initialYear }: { year: number }) {
  const [year, setYear] = useState(initialYear);
  const [pipeline, setPipeline] = useState<DimensionKey[]>([]);
  const [rootNodes, setRootNodes] = useState<GraphNode[]>([]);
  const [rootLoading, setRootLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<SvgLine[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [visibleCols, setVisibleCols] = useState<Set<DetailColumnKey>>(
    new Set(DETAIL_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)),
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const sortPickerRef = useRef<HTMLDivElement>(null);

  // Close pickers on click outside
  useEffect(() => {
    if (!showColPicker && !showSortPicker) return;
    const handler = (e: MouseEvent) => {
      if (showColPicker && colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
      if (showSortPicker && sortPickerRef.current && !sortPickerRef.current.contains(e.target as Node)) {
        setShowSortPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColPicker, showSortPicker]);

  const cycleSortCol = (key: SortableKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const toggleCol = (key: DetailColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const available = ALL_DIMENSIONS.filter((d) => !pipeline.includes(d.key));

  /* ── Fetch nodes from API ─────────────────────── */
  const fetchNodes = useCallback(
    async (dims: DimensionKey[], filters: Record<string, string>) => {
      const res = await fetch(
        `/api/smart-graph?year=${year}&dimensions=${dims.join(",")}&filters=${encodeURIComponent(JSON.stringify(filters))}`,
      );
      if (!res.ok) return { nodes: [] as { id: string; name: string; gp: number; revenue: number; units: number; margin: number; avatarUrl?: string | null }[], saleDetailsByNode: undefined as Record<string, SaleDetail[]> | undefined };
      const data = await res.json();
      return {
        nodes: (data.nodes ?? []) as {
          id: string;
          name: string;
          gp: number;
          revenue: number;
          units: number;
          margin: number;
          avatarUrl?: string | null;
        }[],
        saleDetailsByNode: data.saleDetailsByNode as Record<string, SaleDetail[]> | undefined,
      };
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
        const { nodes, saleDetailsByNode } = await fetchNodes(dims, {});
        const isLastDim = dims.length === 1;
        setRootNodes(
          nodes.map((n) => ({
            ...n,
            dimension: dims[0],
            children: [],
            expanded: false,
            loading: false,
            filters: { [dims[0]]: n.id },
            ...(isLastDim && saleDetailsByNode?.[n.id] ? { saleDetails: saleDetailsByNode[n.id] } : {}),
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
        // No more dimensions to drill — fetch individual sale details
        try {
          const res = await fetch(
            `/api/smart-graph?year=${year}&dimensions=${pipeline.join(",")}&filters=${encodeURIComponent(JSON.stringify(targetNode.filters))}`,
          );
          const data = res.ok ? await res.json() : { saleDetails: [] };
          const saleDetails: SaleDetail[] = data.saleDetails ?? [];
          setRootNodes((prev) => {
            const markDone = (nodes: GraphNode[], depth: number): GraphNode[] =>
              nodes.map((n, i) =>
                i !== path[depth]
                  ? n
                  : depth === path.length - 1
                    ? { ...n, loading: false, expanded: true, saleDetails }
                    : { ...n, children: markDone(n.children, depth + 1) },
              );
            return markDone(prev, 0);
          });
        } catch {
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
        }
        return;
      }

      // Fetch children
      const { nodes: childData, saleDetailsByNode } = await fetchNodes(pipeline, targetNode.filters);
      const isLeafDim = pipeline.indexOf(nextDim) === pipeline.length - 1;
      const children: GraphNode[] = childData.map((c) => ({
        ...c,
        dimension: nextDim,
        children: [],
        expanded: false,
        loading: false,
        filters: { ...targetNode!.filters, [nextDim]: c.id },
        ...(isLeafDim && saleDetailsByNode?.[c.id] ? { saleDetails: saleDetailsByNode[c.id] } : {}),
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

  /* ── Compute SVG connector lines from DOM positions ── */
  const computeLines = useCallback(() => {
    const container = treeRef.current;
    if (!container) {
      setLines([]);
      return;
    }

    const cRect = container.getBoundingClientRect();
    const sL = container.scrollLeft;
    const sT = container.scrollTop;

    setSvgSize({ w: container.scrollWidth, h: container.scrollHeight });

    // Collect all badge elements by their path id
    const badges = container.querySelectorAll<HTMLElement>("[data-node-path]");
    const badgeMap = new Map<string, HTMLElement>();
    badges.forEach((el) => {
      const p = el.getAttribute("data-node-path");
      if (p) badgeMap.set(p, el);
    });

    const newLines: SvgLine[] = [];

    // For each parent container, find parent badge + child badges and draw curves
    const parentContainers = container.querySelectorAll<HTMLElement>(
      "[data-parent-path]",
    );
    parentContainers.forEach((pc) => {
      const parentPath = pc.getAttribute("data-parent-path")!;
      const parentBadge = badgeMap.get(parentPath);
      if (!parentBadge) return;

      const pRect = parentBadge.getBoundingClientRect();
      const x1 = pRect.right - cRect.left + sL;
      const y1 = pRect.top + pRect.height / 2 - cRect.top + sT;

      // Match direct children: "root" → /^\d+$/, "0" → /^0-\d+$/, "0-1" → /^0-1-\d+$/
      const childPattern =
        parentPath === "root"
          ? /^\d+$/
          : new RegExp(
              `^${parentPath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}-\\d+$`,
            );

      let childIdx = 0;
      badgeMap.forEach((childBadge, childPath) => {
        if (!childPattern.test(childPath)) return;

        const chRect = childBadge.getBoundingClientRect();
        const x2 = chRect.left - cRect.left + sL;
        const y2 = chRect.top + chRect.height / 2 - cRect.top + sT;

        newLines.push({
          x1,
          y1,
          x2,
          y2,
          color: BRANCH_COLORS[childIdx % BRANCH_COLORS.length],
        });
        childIdx++;
      });
    });

    setLines(newLines);
  }, []);

  // Recompute lines whenever the tree structure changes
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(computeLines);
    });
  }, [rootNodes, computeLines]);

  // Also recompute on resize
  useEffect(() => {
    const container = treeRef.current;
    if (!container) return;
    const ro = new ResizeObserver(computeLines);
    ro.observe(container);
    return () => ro.disconnect();
  }, [computeLines]);

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
            Drag dimensions into the pipeline to build your drill-down tree
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
          {/* Column visibility picker */}
          {pipeline.length > 0 && (
            <div className="relative" ref={colPickerRef}>
              <button
                onClick={() => setShowColPicker(!showColPicker)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  showColPicker
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <ListFilter className="h-3.5 w-3.5" />
                Columns
                <span className="ml-0.5 rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {visibleCols.size}/{DETAIL_COLUMNS.length}
                </span>
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Show / Hide</p>
                  {DETAIL_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-50 cursor-pointer text-xs text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {col.label}
                    </label>
                  ))}
                  <div className="mt-1 border-t border-zinc-100 pt-1 flex gap-1 px-1">
                    <button
                      onClick={() => setVisibleCols(new Set(DETAIL_COLUMNS.map((c) => c.key)))}
                      className="flex-1 rounded px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setVisibleCols(new Set())}
                      className="flex-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                    >
                      None
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Sort picker */}
          {pipeline.length > 0 && (
            <div className="relative" ref={sortPickerRef}>
              <button
                onClick={() => setShowSortPicker(!showSortPicker)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  showSortPicker
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : sortConfig
                      ? "border-indigo-300 bg-indigo-50/50 text-indigo-600"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort
                {sortConfig && (
                  <span className="ml-0.5 rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                    {[...NODE_SORT_OPTIONS, ...DETAIL_SORT_OPTIONS].find((c) => c.key === sortConfig.key)?.label} {sortConfig.dir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
              {showSortPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Nodes</p>
                  {NODE_SORT_OPTIONS.map((col) => {
                    const isActive = sortConfig?.key === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => { cycleSortCol(col.key); }}
                        className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                          isActive ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{col.label}</span>
                        {isActive && (
                          sortConfig!.dir === "asc"
                            ? <ArrowUp className="h-3.5 w-3.5" />
                            : <ArrowDown className="h-3.5 w-3.5" />
                        )}
                        {!isActive && <ArrowUpDown className="h-3 w-3 text-zinc-300" />}
                      </button>
                    );
                  })}
                  <div className="my-1 border-t border-zinc-100" />
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Details</p>
                  {DETAIL_SORT_OPTIONS.map((col) => {
                    const isActive = sortConfig?.key === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => { cycleSortCol(col.key); }}
                        className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                          isActive ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{col.label}</span>
                        {isActive && (
                          sortConfig!.dir === "asc"
                            ? <ArrowUp className="h-3.5 w-3.5" />
                            : <ArrowDown className="h-3.5 w-3.5" />
                        )}
                        {!isActive && <ArrowUpDown className="h-3 w-3 text-zinc-300" />}
                      </button>
                    );
                  })}
                  {sortConfig && (
                    <div className="mt-1 border-t border-zinc-100 pt-1 px-1">
                      <button
                        onClick={() => { setSortConfig(null); setShowSortPicker(false); }}
                        className="w-full rounded px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                      >
                        Clear sort
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Top bar: Available dimensions + Pipeline drop zone ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        {/* Available dimension chips */}
        {available.length > 0 && (
          <div className="flex items-center gap-2">
            {available.map((dim) => (
              <div
                key={dim.key}
                draggable
                onDragStart={(e) => onDragStart(e, dim.key)}
                className={`flex cursor-grab items-center gap-1.5 rounded-lg border ${dim.borderColor} ${dim.bgColor} px-3 py-1.5 text-xs font-semibold ${dim.color} transition-all hover:shadow-md active:cursor-grabbing active:shadow-lg`}
              >
                <GripVertical className="h-3 w-3 opacity-40" />
                {dim.icon}
                <span>{dim.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Separator */}
        {available.length > 0 && (
          <div className="h-6 w-px bg-zinc-300 mx-1" />
        )}

        {/* Pipeline drop zone */}
        <div
          ref={dropRef}
          onDragOver={onDragOverDrop}
          onDragLeave={onDragLeaveDrop}
          onDrop={onDrop}
          className={`flex flex-1 min-h-[36px] items-center gap-2 rounded-lg border-2 border-dashed px-3 py-1 transition-colors ${
            dragOver
              ? "border-indigo-400 bg-indigo-50"
              : pipeline.length > 0
                ? "border-zinc-200 bg-zinc-50/50"
                : "border-zinc-300 bg-zinc-50"
          }`}
        >
          {pipeline.length === 0 && (
            <span className="text-xs text-zinc-400 italic">
              Drop here to build hierarchy &hellip;
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
      </div>

      {/* ── Graph Canvas (full width) ────────── */}
      <div className="flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-sm relative" ref={treeRef}>
        {/* SVG connector lines */}
        {lines.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={svgSize.w}
            height={svgSize.h}
            style={{ zIndex: 10 }}
          >
            {lines.map((l, i) => {
              const dx = l.x2 - l.x1;
              const cp = Math.max(60, Math.abs(dx) * 0.5);
              return (
                <path
                  key={i}
                  d={`M${l.x1},${l.y1} C${l.x1 + cp},${l.y1} ${l.x2 - cp},${l.y2} ${l.x2},${l.y2}`}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.7}
                />
              );
            })}
          </svg>
        )}

        {pipeline.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-zinc-400">
            <Network className="h-16 w-16 mb-3 opacity-30" />
            <p className="text-lg font-medium">Build your Smart Graph</p>
            <p className="text-sm mt-1">
              Drag dimensions from the bar above to start
            </p>
          </div>
        ) : rootLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="relative">
            {/* Root label — WYW (Atlanta) */}
            <div className="mb-6 flex items-center gap-3 relative z-20 bg-white rounded-xl px-4 py-2 w-fit shadow-sm" data-parent-path="root">
              <div
                className="h-12 w-12 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center shadow-md overflow-hidden shrink-0"
                data-node-path="root"
              >
                <Image
                  src="/God's Eye 2.png"
                  alt="WYW"
                  width={40}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-zinc-800">
                  WYW (Atlanta)
                </span>
                <span className="text-sm font-medium text-zinc-600">
                  {year} · Smart Graph
                </span>
              </div>
            </div>
            {/* Tree nodes */}
            <div className="ml-8 pl-4">
              {sortNodes(rootNodes, sortConfig).map((node, i) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  path={[i]}
                  pathStr={String(i)}
                  pipeline={pipeline}
                  onToggle={toggleNode}
                  visibleCols={visibleCols}
                  sortConfig={sortConfig}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Recursive Tree Node ──────────────────────────── */

function TreeNode({
  node,
  path,
  pathStr,
  pipeline,
  onToggle,
  visibleCols,
  sortConfig,
}: {
  node: GraphNode;
  path: number[];
  pathStr: string;
  pipeline: DimensionKey[];
  onToggle: (path: number[]) => void;
  visibleCols: Set<DetailColumnKey>;
  sortConfig: SortConfig;
}) {
  const dim = dimMap.get(node.dimension);
  const dimIdx = pipeline.indexOf(node.dimension);
  const hasMoreDimensions = dimIdx < pipeline.length - 1;

  const isPerson = node.dimension === "person";
  const isBrand = node.dimension === "brand";

  return (
    <div className="py-1.5" data-parent-path={node.expanded && node.children.length > 0 ? pathStr : undefined}>
      <button
        onClick={() => onToggle(path)}
        className={`group relative z-20 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all hover:bg-white/70 hover:shadow-sm ${
          node.expanded ? "bg-white/70 shadow-sm" : ""
        }`}
      >
        {/* Expand/collapse icon */}
        {hasMoreDimensions ? (
          node.loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent shrink-0" />
          ) : node.expanded ? (
            <ChevronDown className="h-5 w-5 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0" />
          )
        ) : (
          <span className={`h-3 w-3 rounded-full ${dim?.dotColor ?? "bg-zinc-400"} shrink-0`} />
        )}

        {/* Avatar / Brand image / Dimension icon */}
        {isPerson ? (
          <UserAvatar name={node.name} avatarUrl={node.avatarUrl} size={32} />
        ) : isBrand ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-sm shrink-0">
            <BrandIcon name={node.name} size={22} />
          </span>
        ) : null}

        {/* Name badge */}
        <span
          data-node-path={pathStr}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold shadow-sm ${
            dim?.borderColor ?? "border-zinc-300"
          } ${dim?.bgColor ?? "bg-zinc-50"} ${dim?.color ?? "text-zinc-700"}`}
        >
          {!isPerson && !isBrand && dim?.icon}
          {node.name}
        </span>

        {/* Metrics */}
        <span className="ml-auto flex items-center gap-4 text-xs text-zinc-500">
          <span className="font-bold text-zinc-700 text-sm">
            {formatCurrency(node.gp)}
          </span>
          <span className="hidden sm:inline">
            {node.units} units
          </span>
          <span className="hidden md:inline text-zinc-400">
            {formatPercent(node.margin)} margin
          </span>
        </span>
      </button>

      {/* Children */}
      {node.expanded && node.children.length > 0 && (
        <div className="ml-12 mt-1 pl-4">
          {sortNodes(node.children, sortConfig).map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              path={[...path, i]}
              pathStr={`${pathStr}-${i}`}
              pipeline={pipeline}
              onToggle={onToggle}
              visibleCols={visibleCols}
              sortConfig={sortConfig}
            />
          ))}
        </div>
      )}

      {node.expanded && node.children.length === 0 && !node.loading && (
        <div className="ml-16 pl-4 py-2 relative z-20">
          {!hasMoreDimensions && node.saleDetails && node.saleDetails.length > 0 ? (() => {
            const sorted = sortDetails(node.saleDetails, sortConfig);
            return (
            <div className="rounded-lg border border-zinc-200 overflow-x-auto bg-white/80 shadow-sm backdrop-blur-sm">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-left">
                    {visibleCols.has("brand") && <th className="px-3 py-2 font-medium">Brand</th>}
                    {visibleCols.has("reference") && <th className="px-3 py-2 font-medium">Reference</th>}
                    {visibleCols.has("stock_number") && <th className="px-3 py-2 font-medium">Stock #</th>}
                    {visibleCols.has("sold_for") && <th className="px-3 py-2 font-medium text-right">Sold For</th>}
                    {visibleCols.has("profit") && <th className="px-3 py-2 font-medium text-right">Profit</th>}
                    {visibleCols.has("date") && <th className="px-3 py-2 font-medium">Date</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((sale) => (
                    <tr key={sale.id} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                      {visibleCols.has("brand") && <td className="px-3 py-1.5 font-medium text-zinc-700">{sale.brand ?? "—"}</td>}
                      {visibleCols.has("reference") && <td className="px-3 py-1.5 text-zinc-600">{sale.reference ?? "—"}</td>}
                      {visibleCols.has("stock_number") && <td className="px-3 py-1.5 text-zinc-500">{sale.stock_number ?? "—"}</td>}
                      {visibleCols.has("sold_for") && <td className="px-3 py-1.5 text-right text-zinc-700">{formatCurrency(sale.sold_for)}</td>}
                      {visibleCols.has("profit") && <td className={`px-3 py-1.5 text-right font-medium ${sale.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {formatCurrency(sale.profit)}
                      </td>}
                      {visibleCols.has("date") && <td className="px-3 py-1.5 text-zinc-500">
                        {new Date(sale.date_out).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })() : (
            <span className="text-xs text-zinc-400 italic">
              {hasMoreDimensions ? "No data at this level" : "No sale details"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
