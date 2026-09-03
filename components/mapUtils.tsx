"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";

/**
 * Pan and zoom for a map svg. On touch screens the page keeps scrolling
 * over the map until the user pinches in; once zoomed, one finger pans
 * the map and "reset" hands scrolling back to the page.
 */
export function useMapZoom(svgRef: RefObject<SVGSVGElement | null>, gRef: RefObject<SVGGElement | null>, width: number, height: number, maxScale: number) {
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, maxScale])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (e) => {
        const t = e.transform;
        g.attr("transform", t.toString());
        const isZoomed = t.k > 1.001;
        svg.style("touch-action", isZoomed ? "none" : "pan-y");
        setZoomed(isZoomed);
      });
    svg.style("touch-action", "pan-y").call(z);
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, [svgRef, gRef, width, height, maxScale]);

  const resetZoom = useCallback(() => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, [svgRef]);

  return { zoomed, resetZoom };
}

export interface TipState {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  touch: boolean;
}

/**
 * Hover tooltip on a mouse; on touch, a tap shows the same lines in a
 * strip under the map, and a tap on empty space or on the strip
 * dismisses it. Tracked races skip the strip since the panel opens.
 */
export function useMapTip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const pointerType = useRef("mouse");

  const place = useCallback((e: { clientX: number; clientY: number; currentTarget: EventTarget & Element }, lines: string[], touch: boolean) => {
    const el = e.currentTarget;
    const svg = el instanceof SVGSVGElement ? el : (el as SVGGraphicsElement).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width, height: rect.height, lines, touch });
  }, []);

  /** onPointerMove on a mark: mouse only. */
  const hover = useCallback(
    (e: PointerEvent<SVGElement>, lines: string[]) => {
      if (e.pointerType === "mouse") place(e, lines, false);
    },
    [place],
  );
  /** Call from a mark's onClick: shows the tip only after a touch or pen tap. */
  const tap = useCallback(
    (e: { clientX: number; clientY: number; currentTarget: EventTarget & Element }, lines: string[]) => {
      if (pointerType.current !== "mouse") place(e, lines, true);
    },
    [place],
  );
  const hide = useCallback(() => setTip(null), []);

  const svgProps = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      pointerType.current = e.pointerType;
    },
    onPointerLeave: (e: PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === "mouse") hide();
    },
    onClick: (e: { target: EventTarget; currentTarget: EventTarget }) => {
      if (e.target === e.currentTarget) hide();
    },
  };

  return { tip, hover, tap, hide, svgProps };
}

export function MapTip({ tip, onDismiss }: { tip: TipState | null; onDismiss: () => void }) {
  if (!tip) return null;
  const lines = tip.lines.map((l, i) => (
    <div key={i} className={i === 0 ? "display text-[18px]" : "text-text-2"}>
      {l}
    </div>
  ));
  if (tip.touch) {
    return (
      <div className="mt-2 border-[3px] border-border bg-bg px-3 py-2 text-[13px] flex items-start gap-3" onClick={onDismiss} role="status">
        <div className="min-w-0 flex-1">{lines}</div>
        <span className="label text-[11px] text-text-3 shrink-0 pt-1">Tap to close</span>
      </div>
    );
  }
  const flipX = tip.x > tip.width / 2;
  const flipY = tip.y > tip.height * 0.6;
  return (
    <div
      className="pointer-events-none absolute z-10 border-[3px] border-border bg-bg px-3 py-2 text-[13px] max-w-72"
      style={{
        left: flipX ? undefined : tip.x + 12,
        right: flipX ? tip.width - tip.x + 12 : undefined,
        top: flipY ? undefined : tip.y + 12,
        bottom: flipY ? tip.height - tip.y + 12 : undefined,
      }}
    >
      {lines}
    </div>
  );
}
