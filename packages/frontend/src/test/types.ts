// Test-specific type definitions

export interface MockAuthUIProps {
  providers?: string[];
  localization?: {
    variables?: {
      sign_in?: {
        social_provider_text?: string;
      };
    };
  };
  appearance?: {
    theme?: string;
  };
  view?: string;
  theme?: string;
  onlyThirdPartyProviders?: boolean;
  redirectTo?: string;
  showLinks?: boolean;
  magicLink?: boolean;
}

export interface StoryRenderArgs<T = Record<string, unknown>> {
  args: T;
}

export interface RouterModule {
  useNavigate: () => typeof vi.fn;
  useLocation: () => { pathname: string };
  Navigate: React.FC<{ to: string; state?: unknown; replace?: boolean }>;
  Outlet: React.FC;
}