import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { DashboardPage } from "../DashboardPage";
import { supabase } from "@/lib/supabase";
import { AuthProvider } from "@/hooks/useAuth";

const mockNavigate = vi.fn();

// Mock ResponsiveHeader to avoid useAuth context issues
vi.mock("@/components/Header/ResponsiveHeader", () => ({
  ResponsiveHeader: () => <div data-testid="header">Header</div>,
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

interface MockUser {
  id: string;
  email: string;
  app_metadata: { tier: string };
  aud: string;
  created_at: string;
}

// Helper to render DashboardPage with AuthProvider
const renderDashboardPage = () => {
  return renderWithRouter(
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to login if user is not authenticated", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("should display user information when authenticated", async () => {
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier2" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("プラン:")).toBeInTheDocument();
      expect(screen.getByText("Tier 2")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("should display API key section", async () => {
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("APIキー")).toBeInTheDocument();
      expect(screen.getByText(/sk_test/)).toBeInTheDocument();
      expect(screen.getByLabelText("APIキーをコピー")).toBeInTheDocument();
    });
  });

  it("should copy API key to clipboard", async () => {
    const user = userEvent.setup();
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      configurable: true,
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByLabelText("APIキーをコピー")).toBeInTheDocument();
    });

    const copyButton = screen.getByLabelText("APIキーをコピー");
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("sk_test")
    );

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText("APIキーをコピーしました")).toBeInTheDocument();
    });
  });

  it("should display usage statistics", async () => {
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("API使用状況")).toBeInTheDocument();
      expect(screen.getByText("/api/data/**")).toBeInTheDocument();
      expect(screen.getByText("45 / 60")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  it("should handle sign out", async () => {
    const user = userEvent.setup();
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    const logoutButton = screen.getByText("ログアウト");
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("should handle sign out error", async () => {
    const user = userEvent.setup();
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new Error("Sign out failed"),
    });

    // Mock window.alert
    window.alert = vi.fn();

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    const logoutButton = screen.getByText("ログアウト");
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      "ログアウトに失敗しました。もう一度お試しください。"
    );
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  it("should handle unexpected sign out error", async () => {
    const user = userEvent.setup();
    const mockUser: MockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockRejectedValue(
      new Error("Network error")
    );

    // Mock window.alert
    window.alert = vi.fn();

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    const logoutButton = screen.getByText("ログアウト");
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("予期せぬエラーが発生しました。");
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  it("should display loading state", () => {
    vi.mocked(supabase.auth.getUser).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderDashboardPage();

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("should redirect on auth error", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Auth error"),
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});