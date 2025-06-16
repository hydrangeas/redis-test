import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";

// Mock react-router-dom
let mockLocation = { pathname: "/" };
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }: any) => children,
    Routes: ({ children }: any) => children,
    Route: ({ path, element }: any) => {
      if (path === mockLocation.pathname || path === "*") {
        return element;
      }
      if (path === "/dashboard" && mockLocation.pathname === "/dashboard") {
        return element;
      }
      if (path === "/login" && mockLocation.pathname === "/login") {
        return element;
      }
      if (
        path === "/auth/callback" &&
        mockLocation.pathname === "/auth/callback"
      ) {
        return element;
      }
      if (path === "/api-docs" && mockLocation.pathname === "/api-docs") {
        return element;
      }
      return null;
    },
    Navigate: ({ to }: any) => <div>Navigate to {to}</div>,
    useLocation: () => mockLocation,
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
