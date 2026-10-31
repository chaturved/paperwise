export const PROTECTED_PATHS = ["/dashboard", "/library", "/analytics", "/settings", "/onboarding"];

export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATHS.some((route) => matchesRoute(pathname, route));
}
