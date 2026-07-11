'use client';

import { useEffect, useState } from 'react';

/** The green accent of the Bought column — the burst color. */
const BOUGHT_ACCENT = '#16A34A';
const DOT_COUNT = 9;

/** One radiating particle, aimed outward at an even angle around the circle. */
function dotStyle(i: number): React.CSSProperties {
  const angle = (i / DOT_COUNT) * Math.PI * 2;
  const distance = 26 + (i % 3) * 8; // slight variance
  return {
    // Custom props consumed by the .celebrate-dot keyframes.
    ['--dx' as string]: `${Math.cos(angle) * distance}px`,
    ['--dy' as string]: `${Math.sin(angle) * distance}px`,
    ['--d' as string]: `${(i % 4) * 20}ms`,
    backgroundColor: BOUGHT_ACCENT,
  };
}

/**
 * A brief CSS-only particle burst radiating from the card center. Rendered
 * only when a card is dropped into the Bought column — the one emotional beat
 * in the tool. Self-removes after the animation.
 */
export function BoughtCelebration({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 650);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible">
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <span
          key={i}
          className="celebrate-dot absolute h-1.5 w-1.5 rounded-full"
          style={dotStyle(i)}
        />
      ))}
    </div>
  );
}
