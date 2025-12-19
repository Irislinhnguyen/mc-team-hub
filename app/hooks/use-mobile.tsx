import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Force desktop layout on all devices (Looker Studio approach)
// When true, viewport is set to 1280px and mobile UI is disabled
const FORCE_DESKTOP_LAYOUT = true;

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
