export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  "2xl": `@media (min-width: ${breakpoints["2xl"]}px)`,
} as const;

export const isMobile = () => window.innerWidth < breakpoints.md;
export const isTablet = () =>
  window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg;
export const isDesktop = () => window.innerWidth >= breakpoints.lg;
