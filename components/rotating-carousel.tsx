"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * 3D rotating cylinder carousel.
 * Items are positioned around a circle and auto-rotate.
 * Clicking an item selects it and pauses rotation.
 */
export function RotatingCarousel({
  items,
  selectedId,
  onSelect,
  renderItem,
  itemSize = 100,
  label,
  icon,
}: {
  items: { id: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  renderItem: (item: { id: string }, opts: { isFront: boolean }) => React.ReactNode;
  itemSize?: number;
  label?: string;
  icon?: React.ReactNode;
}) {
  const count = items.length;
  const angleStep = count > 0 ? 360 / count : 0;
  // radius so items don't overlap: circumference / (2*pi) with some padding
  const radius = Math.max(count * (itemSize + 16) / (2 * Math.PI), 120);

  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; rot: number } | null>(null);
  const animRef = useRef<number>(0);
  const lastTime = useRef<number>(0);

  // Auto-rotate
  useEffect(() => {
    if (paused || dragging || count === 0) return;
    let running = true;
    lastTime.current = performance.now();
    const animate = (now: number) => {
      if (!running) return;
      const dt = now - lastTime.current;
      lastTime.current = now;
      // speed: degrees per ms (roughly 12 deg/s)
      setRotation((r) => r + dt * 0.012);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [paused, dragging, count]);

  // Pause on select
  useEffect(() => {
    if (selectedId) setPaused(true);
  }, [selectedId]);

  const handleSelect = useCallback(
    (id: string) => {
      if (selectedId === id) {
        onSelect(null);
        setPaused(false);
      } else {
        onSelect(id);
        setPaused(true);
      }
    },
    [selectedId, onSelect],
  );

  // Drag / swipe to rotate
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStart.current = { x: e.clientX, rot: rotation };
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [rotation],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      setRotation(dragStart.current.rot + dx * 0.3);
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    dragStart.current = null;
    setDragging(false);
  }, []);

  if (count === 0) return null;

  // Height scales with radius
  const containerHeight = Math.min(radius * 0.6 + itemSize, 200);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            {icon}
            {label}
          </h3>
          <button
            onClick={() => { setPaused(!paused); if (selectedId) onSelect(null); }}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1 rounded-md hover:bg-zinc-100"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      )}
      <div
        className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ height: containerHeight, perspective: "800px" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(-${radius}px) rotateY(${rotation}deg)`,
            transition: dragging ? "none" : undefined,
          }}
        >
          {items.map((item, i) => {
            const angle = i * angleStep;
            // Compute which item is currently facing front
            const normalizedAngle = ((rotation + angle) % 360 + 360) % 360;
            const isFront = normalizedAngle > 330 || normalizedAngle < 30;

            return (
              <div
                key={item.id}
                className="absolute left-1/2 top-1/2 transition-opacity duration-300"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px) translate(-50%, -50%)`,
                  opacity: (() => {
                    // Items facing away fade out
                    const a = ((rotation + angle) % 360 + 360) % 360;
                    if (a > 90 && a < 270) return 0.15;
                    return 1;
                  })(),
                }}
              >
                <button
                  onClick={() => handleSelect(item.id)}
                  className={`transition-all duration-200 ${
                    selectedId === item.id ? "scale-110 z-10" : ""
                  }`}
                  style={{ touchAction: "pan-y" }}
                >
                  {renderItem(item, { isFront })}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
