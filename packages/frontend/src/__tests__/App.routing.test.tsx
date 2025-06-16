import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";

// Mock react-router-dom
let mockLocation = { pathname: "/" };
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Route: ({ path, element, children, index }: { path?: string; element?: React.ReactNode; children?: React.ReactNode; index?: boolean }) => {
      // Handle index route
      if (index && mockLocation.pathname === "/") {
        return element;
      }
      
      // Handle path routes
      if (path) {
        if (path === mockLocation.pathname || 
            (path === "*" && !["/", "/login", "/dashboard", "/auth/callback", "/api-docs"].includes(mockLocation.pathname))) {
          return element;
        }
      }
      
      // Handle parent routes with children
      if (children) {
        return <div>{children}</div>;
      }
      
      return null;
    },
    Navigate: ({ to }: { to: string }) => <div>Navigate to {to}</div>,
    useLocation: () => mockLocation,
    Outlet: () => null,
  };
});

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// Mock AuthProvider
vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

// Mock Layout
vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: { children?: React.ReactNode }) => <div>{children || <div>Outlet</div>}</div>,
}));

// Mock Guards
vi.mock("@/router/guards/AuthGuard", () => ({
  AuthGuard: ({ children }: { children?: React.ReactNode }) => {
    if (mockLocation.pathname === "/dashboard") {
      return <div>Navigate to /login</div>;
    }
    return <div>{children}</div>;
  },
}));

vi.mock("@/router/guards/GuestGuard", () => ({
  GuestGuard: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

// Mock LoadingSpinner
vi.mock("@/components/common/LoadingSpinner", () => ({
  LoadingSpinner: () => <div>Loading...</div>,
}));

// Mock components with minimal implementation
vi.mock("@/pages/LandingPage", () => ({
  LandingPage: () => <div data-testid="landing-page">Landing Page</div>,
}));

vi.mock("@/pages/Login", () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock("@/pages/DashboardPage", () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock("@/pages/auth/callback", () => ({
  AuthCallbackPage: () => (
    <div data-testid="auth-callback-page">Auth Callback Page</div>
  ),
}));

vi.mock("@/pages/NotFoundPage", () => ({
  NotFoundPage: () => <div data-testid="not-found-page">404 Not Found</div>,
}));

vi.mock("@/components/ApiDocsRedirect", () => ({
  ApiDocsRedirect: () => (
    <div data-testid="api-docs-redirect">API Docs Redirect</div>
  ),
}));

describe("App Routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { pathname: "/" };
  });

  it("should render landing page at root path", async () => {
    mockLocation = { pathname: "/" };
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });
  });

  it("should render login page when not authenticated", async () => {
    mockLocation = { pathname: "/login" };
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it("should render auth callback page", async () => {
    mockLocation = { pathname: "/auth/callback" };
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-callback-page")).toBeInTheDocument();
    });
  });

  it("should render API docs redirect at /api-docs", async () => {
    mockLocation = { pathname: "/api-docs" };
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("api-docs-redirect")).toBeInTheDocument();
    });
  });

  it("should render 404 page for unknown routes", async () => {
    mockLocation = { pathname: "/unknown-route" };
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    });
  });

  it("should show Navigate component when accessing dashboard without auth", async () => {
    mockLocation = { pathname: "/dashboard" };
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Navigate to /login")).toBeInTheDocument();
    });
  });
});
