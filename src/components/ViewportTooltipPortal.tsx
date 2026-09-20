import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  anchorRect: DOMRect | null;
  visible: boolean;
  content: React.ReactNode;
}

export const ViewportTooltipPortal: React.FC<TooltipProps> = ({ anchorRect, visible, content }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!visible || !anchorRect || !tooltipRef.current) return;

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;

    const margin = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // --- HORIZONTAL POSITIONING & CLAMPING ---
    // Center horizontally over the hovered anchor element
    let targetLeft = anchorRect.left + (anchorRect.width / 2) - (tooltipWidth / 2);

    // Clamp strictly within the left and right screen borders
    if (targetLeft < margin) {
      targetLeft = margin;
    } else if (targetLeft + tooltipWidth > viewportWidth - margin) {
      targetLeft = viewportWidth - tooltipWidth - margin;
    }

    // --- VERTICAL POSITIONING & SMART FLIP ---
    // Default: Display directly above the anchor element
    let targetTop = anchorRect.top - tooltipHeight - margin;

    // If clipping past the top of the browser, flip below the anchor
    if (targetTop < margin) {
      targetTop = anchorRect.bottom + margin;
    }

    // Secondary Guard: If flipping below pushes it past the bottom of the screen, hard-clamp
    if (targetTop + tooltipHeight > viewportHeight - margin) {
      targetTop = Math.max(margin, viewportHeight - tooltipHeight - margin);
    }

    setCoords({ top: Math.round(targetTop), left: Math.round(targetLeft) });
  }, [visible, anchorRect, content]);

  if (!visible || !anchorRect) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 2147483647, // Maximum integer z-index to stay above all modals and HUD frames
        pointerEvents: 'none', // Prevents mouseenter/mouseleave thrashing
        maxWidth: 'min(380px, calc(100vw - 20px))',
        visibility: coords.top === 0 && coords.left === 0 ? 'hidden' : 'visible',
      }}
      className="tactical-tooltip-wrapper"
    >
      {content}
    </div>,
    document.body
  );
};
