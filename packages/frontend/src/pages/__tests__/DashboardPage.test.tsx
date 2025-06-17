import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { DashboardPage } from "../DashboardPage";
import { supabase } from "@/lib/supabase";

const mockNavigate = vi.fn();
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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to home if user is not authenticated", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
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

    renderWithRouter(<DashboardPage />);

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

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("APIキー:")).toBeInTheDocument();
      expect(screen.getByText(/test-api/)).toBeInTheDocument();
      expect(screen.getByTestId("copy-api-key-button")).toBeInTheDocument();
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
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("copy-api-key-button")).toBeInTheDocument();
    });

    const copyButton = screen.getByTestId("copy-api-key-button");
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("test-api-key")
    );

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText("コピーしました！")).toBeInTheDocument();
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

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("使用状況")).toBeInTheDocument();
      expect(screen.getByText("45 / 60")).toBeInTheDocument();
      expect(screen.getByText("リクエスト/分")).toBeInTheDocument();
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

    renderWithRouter(<DashboardPage />);

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

    renderWithRouter(<DashboardPage />);

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

    renderWithRouter(<DashboardPage />);

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

    renderWithRouter(<DashboardPage />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("should redirect on auth error", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Auth error"),
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});