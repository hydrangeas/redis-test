import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { LandingPage } from "../LandingPage";
import { supabase } from "@/lib/supabase";

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

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock behavior
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    });
  });

  it("should render the landing page with correct content", async () => {
    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("奈良県の公開データを")).toBeInTheDocument();
      expect(
        screen.getByText(/奈良県が公開している様々な統計データを/)
      ).toBeInTheDocument();
    });
    
    // Check for API docs links
    const apiDocsLinks = screen.getAllByText("APIドキュメントを見る");
    expect(apiDocsLinks.length).toBeGreaterThan(0);
  });

  it("should show auth buttons when user is not authenticated", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("今すぐ始める")).toBeInTheDocument();
      expect(screen.queryByText("ダッシュボードへ")).not.toBeInTheDocument();
    });
  });

  it("should show dashboard button when user is authenticated", async () => {
    const mockUser = {
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

    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      expect(screen.getByText("ダッシュボードへ")).toBeInTheDocument();
      expect(screen.queryByText("今すぐ始める")).not.toBeInTheDocument();
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
      data: { user: mockUser },
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


  it("should have correct link to API documentation", async () => {
    renderWithRouter(<LandingPage />);

    await waitFor(() => {
      const apiDocsLinks = screen.getAllByText("APIドキュメントを見る");
      expect(apiDocsLinks.length).toBeGreaterThan(0);
      
      // Check one of the links
      const firstLink = apiDocsLinks[0].closest('a');
      expect(firstLink).toHaveAttribute("href", "/api-docs");
    });
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

    // Check for main content
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();

    // Check for main headings in sections  
    await waitFor(() => {
      expect(screen.getByText("奈良県の公開データを")).toBeInTheDocument();
      expect(screen.getByText("特徴")).toBeInTheDocument();
      expect(screen.getByText("利用開始までの流れ")).toBeInTheDocument();
      expect(screen.getByText("ドキュメンテーション")).toBeInTheDocument();
    });
  });
});
