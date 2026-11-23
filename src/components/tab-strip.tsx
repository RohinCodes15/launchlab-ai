"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Within this many pixels of the end counts as scrolled to the end.
const END_TOLERANCE_PX = 2;

interface TabStripProps {
  label: string;
  /** Changes when the current tab changes, so it can be scrolled into view. */
  currentKey: string;
  className?: string;
  children: ReactNode;
}

/**
 * A horizontally scrolling nav. Keeps the current tab (`aria-current="page"`) in view and
 * fades the right edge while more tabs are hidden, so the overflow is visible on phones.
 */
export function TabStrip({ label, currentKey, className = "", children }: TabStripProps) {
  const navRef = useRef<HTMLElement>(null);
  const [hasMore, setHasMore] = useState(false);

  function updateFade() {
    const nav = navRef.current;
    if (!nav) return;
    setHasMore(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - END_TOLERANCE_PX);
  }

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const current = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (current) {
      // Scroll only the strip, never the page. The nav is the offsetParent, so this is
      // the tab's position in the strip's content, independent of the current scroll.
      const offset = current.offsetLeft;
      if (
        offset < nav.scrollLeft ||
        offset + current.offsetWidth > nav.scrollLeft + nav.clientWidth
      ) {
        nav.scrollLeft = offset - (nav.clientWidth - current.offsetWidth) / 2;
      }
    }
    updateFade();
    const observer = new ResizeObserver(updateFade);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [currentKey]);

  return (
    <div className="relative">
      <nav
        ref={navRef}
        aria-label={label}
        onScroll={updateFade}
        className={`relative ${className}`}
      >
        {children}
      </nav>
      {hasMore && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent"
        />
      )}
    </div>
  );
}
