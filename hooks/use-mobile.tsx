import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Force desktop layout on all devices (Looker Studio approach)
// When true, viewport is set to 1280px and mobile UI is disabled
const FORCE_DESKTOP_LAYOUT = true;

// Breakpoint type for compatibility with BaseResponsiveChart
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // If FORCE_DESKTOP_LAYOUT is enabled, always return false (desktop mode)
    if (FORCE_DESKTOP_LAYOUT) {
      setIsMobile(false);
      return;
    }

    // Original responsive behavior (preserved for potential future use)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * useBreakpoint - Simplified version for FORCE_DESKTOP_LAYOUT mode
 * Always returns 'xl' (desktop) when FORCE_DESKTOP_LAYOUT is true
 * Maintains API compatibility with BaseResponsiveChart
 */
export function useBreakpoint(): Breakpoint {
  // When forcing desktop layout, always return 'xl'
  if (FORCE_DESKTOP_LAYOUT) {
    return 'xl';
  }

  // Fallback: return 'md' for normal screens
  return 'md';
}
