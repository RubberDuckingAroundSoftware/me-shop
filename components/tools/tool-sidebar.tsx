'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getToolMeta, getToolName, getToolIcon } from './tool-registry';

const WIDTH_KEY = 'meshop_tool_sidebar_width';
const COLLAPSED_KEY = 'meshop_tool_sidebar_collapsed';
const DEFAULT_WIDTH = 200;
const MIN_WIDTH = 160;
const MAX_WIDTH = 420;
// Drag the panel narrower than this and it collapses fully on release.
const COLLAPSE_AT = 120;

function clampWidth(w: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
}

export interface ToolSidebarProps {
  toolIds: string[];
  /** Scenario the project belongs to; drives scenario-specific tool names. */
  scenarioId: string;
  activeToolId: string | null;
  onSelect: (id: string | null) => void;
  /** Label for the "overview" (no tool selected) entry. */
  onOverview: () => void;
  overviewActive: boolean;
}

export function ToolSidebar({
  toolIds,
  scenarioId,
  activeToolId,
  onSelect,
  onOverview,
  overviewActive,
}: ToolSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Tracks the un-clamped width during a drag so we can detect a collapse.
  const rawWidth = useRef(DEFAULT_WIDTH);

  // Restore persisted width + collapsed state on mount.
  useEffect(() => {
    setMounted(true);
    const savedW = Number(localStorage.getItem(WIDTH_KEY));
    if (savedW && !Number.isNaN(savedW)) {
      const w = clampWidth(savedW);
      setWidth(w);
      rawWidth.current = w;
    }
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
  }, []);

  const setCollapsedPersist = (v: boolean) => {
    setCollapsed(v);
    localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0');
  };

  const onHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setResizing(true);

    const onMove = (ev: MouseEvent) => {
      // Panel is anchored left, so dragging the right-edge handle right widens.
      const raw = startWidth + (ev.clientX - startX);
      rawWidth.current = raw;
      setWidth(clampWidth(raw));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      setResizing(false);
      // Dragged well past the minimum → collapse the panel entirely.
      if (rawWidth.current < COLLAPSE_AT) {
        setCollapsedPersist(true);
      } else {
        setWidth((w) => {
          localStorage.setItem(WIDTH_KEY, String(w));
          return w;
        });
      }
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const itemBase =
    'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors md:w-full';
  const activeCls = 'bg-accent-light text-accent';
  const inactiveCls =
    'text-text-secondary hover:bg-surface-hover hover:text-text-primary';

  // The nav entries are shared between the mobile strip and the desktop rail.
  const items = (
    <>
      <button
        onClick={onOverview}
        title="Overview"
        className={cn(itemBase, 'relative', overviewActive ? activeCls : inactiveCls)}
      >
        <Icon name="Home" className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
        <span className="hidden md:inline">Overview</span>
        {overviewActive && (
          <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent md:hidden" />
        )}
      </button>

      <div className="my-2 hidden px-3 text-xs font-medium uppercase tracking-wide text-text-tertiary md:block">
        Tools
      </div>

      {toolIds.map((id) => {
        const meta = getToolMeta(id);
        if (!meta) return null;
        const active = activeToolId === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={getToolName(id, scenarioId)}
            className={cn(itemBase, 'relative', active ? activeCls : inactiveCls)}
          >
            <Icon
              name={getToolIcon(id, scenarioId)}
              className="h-5 w-5 shrink-0 md:h-4 md:w-4"
            />
            <span className="hidden truncate md:inline">
              {getToolName(id, scenarioId)}
            </span>
            {!meta.functional && (
              <span className="hidden text-[10px] text-text-tertiary md:ml-auto md:inline">
                soon
              </span>
            )}
            {active && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent md:hidden" />
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile: icon-only strip, evenly spaced, no scrollbar (no resize/collapse). */}
      <nav className="flex shrink-0 items-center justify-around gap-1 border-b border-border bg-surface p-2 md:hidden">
        {items}
      </nav>

      {/* Desktop, collapsed: a slim rail with a re-open control. */}
      {collapsed ? (
        <div className="hidden shrink-0 md:flex md:flex-col md:items-center md:border-r md:border-border md:bg-surface md:py-3">
          <Tooltip content="Show tools">
            <button
              onClick={() => setCollapsedPersist(false)}
              aria-label="Show tools panel"
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      ) : (
        /* Desktop, expanded: resizable rail with a collapse control. */
        <div
          className={cn(
            'relative hidden shrink-0 md:flex md:flex-col md:border-r md:border-border md:bg-surface',
            !resizing && mounted && 'transition-[width] duration-150 ease-out'
          )}
          style={{ width }}
        >
          <div className="flex items-center justify-end px-2 pt-2">
            <Tooltip content="Collapse panel">
              <button
                onClick={() => setCollapsedPersist(true)}
                aria-label="Collapse tools panel"
                className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
            {items}
          </nav>

          {/* Resize handle on the right edge (mirrors the product drawer). */}
          <div
            onMouseDown={onHandleMouseDown}
            className="group absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize tools panel"
          >
            <div className="absolute right-0 top-0 h-full w-px bg-border transition-colors group-hover:bg-accent" />
            <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-border transition-colors group-hover:bg-accent" />
          </div>
        </div>
      )}
    </>
  );
}
