export const routes = {
  home: "/",
  login: "/login",
  signup: "/login", // Same as login since we use the same page
  dashboard: "/dashboard",
  profile: "/profile",
  apiKeys: "/api-keys",
  usage: "/usage",
  settings: "/settings",
  terms: "/terms",
  privacy: "/privacy",
  authCallback: "/auth/callback",
  apiDocs: "/api-docs",
} as const;

export const isAuthRoute = (path: string): boolean => {
  const authRoutes = [routes.login, routes.signup, routes.authCallback];
  return authRoutes.includes(path as typeof authRoutes[number]);
};

export const isProtectedRoute = (path: string): boolean => {
  const protectedRoutes = [
    routes.dashboard,
    routes.profile,
    routes.apiKeys,
    routes.usage,
    routes.settings,
  ];
  return protectedRoutes.some((route) => path.startsWith(route));
};

export const getRedirectUrl = (from?: string): string => {
  if (!from || isAuthRoute(from)) {
    return routes.dashboard;
  }
  return from;
};
