import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { LandingPage } from "../LandingPage";
import { supabase } from "@/lib/supabase";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = (await vi.importActual("react-router-dom")) as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the landing page with correct content", () => {
    renderWithRouter(<LandingPage />);

    expect(screen.getByText("オープンデータ提供API")).toBeInTheDocument();
    expect(
      screen.getByText(/奈良県のオープンデータをJSON形式で提供/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "APIドキュメント" })
    ).toBeInTheDocument();
  });

  it("should show auth buttons when user is not authenticated", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("ログイン")).toBeInTheDocument();
      expect(screen.getByText("サインアップ")).toBeInTheDocument();
    });
  });

  it("should show dashboard button and logout when user is authenticated", async () => {
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("ダッシュボードへ")).toBeInTheDocument();
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
      expect(screen.queryByText("ログイン")).not.toBeInTheDocument();
    });
  });

  it("should navigate to dashboard when dashboard button is clicked", async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("ダッシュボードへ")).toBeInTheDocument();
    });

    const dashboardButton = screen.getByText("ダッシュボードへ");
    await user.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("should handle logout successfully", async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    const logoutButton = screen.getByText("ログアウト");
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should handle logout error gracefully", async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: { tier: "tier1" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new Error("Logout failed"),
    });

    // Mock window.alert
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });

    const logoutButton = screen.getByText("ログアウト");
    await user.click(logoutButton);

    expect(alertSpy).toHaveBeenCalledWith(
      "ログアウトに失敗しました。もう一度お試しください。"
    );
    alertSpy.mockRestore();
  });

  it("should have correct link to API documentation", () => {
    renderWithRouter(<LandingPage />);

    const apiDocsLink = screen.getByRole("link", { name: "APIドキュメント" });
    expect(apiDocsLink).toHaveAttribute("href", "/api-docs");
    expect(apiDocsLink).toHaveAttribute("target", "_blank");
    expect(apiDocsLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should show loading state while checking auth", () => {
    // Mock getUser to never resolve
    vi.mocked(supabase.auth.getUser).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithRouter(<LandingPage />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("should have accessible structure", async () => {
    renderWithRouter(<LandingPage />);

    // Check for main heading
    const mainHeading = screen.getByRole("heading", { level: 1 });
    expect(mainHeading).toHaveTextContent("オープンデータ提供API");

    // Check for navigation elements
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    // Check for main content
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });
});
