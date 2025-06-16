import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ResponsiveHeader } from "@/components/Header/ResponsiveHeader";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/useMediaQuery");

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
const mockUseMediaQuery = useMediaQuery as vi.MockedFunction<
  typeof useMediaQuery
>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("ResponsiveHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Desktop View", () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false);
    });

    it("should render desktop navigation when not mobile", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      // Desktop navigation should be visible
      const nav = screen.getByRole("navigation", { hidden: true });
      expect(nav).toHaveClass("hidden md:flex");

      // Mobile menu button should be hidden on desktop
      const menuButton = screen.getByLabelText("メニューを開く");
      expect(menuButton).toHaveClass("md:hidden");
    });

    it("should show login/signup buttons for unauthenticated users", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      expect(screen.getByText("ログイン")).toBeInTheDocument();
      expect(screen.getByText("サインアップ")).toBeInTheDocument();
    });

    it("should show dashboard/profile buttons for authenticated users", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "123", email: "test@example.com" } as User,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
      expect(screen.getByText("プロフィール")).toBeInTheDocument();
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true);
    });

    it("should show hamburger menu button on mobile", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      const menuButton = screen.getByLabelText("メニューを開く");
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toBeVisible();
    });

    it("should toggle mobile menu when hamburger button is clicked", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      const menuButton = screen.getByLabelText("メニューを開く");

      // Desktop nav should be hidden, mobile menu not yet visible
      const desktopNav = screen.getByRole("navigation", { hidden: true });
      expect(desktopNav).toHaveClass("hidden");

      // Open menu
      fireEvent.click(menuButton);

      await waitFor(() => {
        // モバイルメニュー内のAPIドキュメントリンクを探す
        const mobileMenuLinks = screen.getAllByText("APIドキュメント");
        expect(mobileMenuLinks.length).toBeGreaterThan(1); // デスクトップとモバイルの両方
        expect(screen.getByLabelText("メニューを閉じる")).toBeInTheDocument();
      });

      // Close menu
      fireEvent.click(screen.getByLabelText("メニューを閉じる"));

      await waitFor(() => {
        // モバイルメニューが閉じられた後、モバイルメニュー内のリンクは非表示になる
        const links = screen.getAllByText("APIドキュメント");
        expect(links.length).toBe(1); // デスクトップナビのみ（hiddenだが存在する）
      });
    });

    it("should prevent scrolling when mobile menu is open", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      const menuButton = screen.getByLabelText("メニューを開く");

      // Open menu
      fireEvent.click(menuButton);

      expect(document.body.style.overflow).toBe("hidden");

      // Close menu
      fireEvent.click(screen.getByLabelText("メニューを閉じる"));

      expect(document.body.style.overflow).toBe("");
    });

    it("should show abbreviated logo on mobile", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      renderWithRouter(<ResponsiveHeader />);

      expect(screen.getByText("奈良県API")).toBeInTheDocument();
      expect(screen.queryByText("奈良県オープンデータAPI")).toHaveClass(
        "hidden sm:inline"
      );
    });
  });

  describe("Responsive Behavior", () => {
    it("should close mobile menu when resizing to desktop", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: vi.fn(),
      });

      // Start as mobile
      mockUseMediaQuery.mockReturnValue(true);
      const { rerender } = renderWithRouter(<ResponsiveHeader />);

      // Open mobile menu
      fireEvent.click(screen.getByLabelText("メニューを開く"));
      expect(document.body.style.overflow).toBe("hidden");

      // Resize to desktop
      mockUseMediaQuery.mockReturnValue(false);
      rerender(
        <BrowserRouter>
          <ResponsiveHeader />
        </BrowserRouter>
      );

      // Menu should be closed and scroll restored
      expect(document.body.style.overflow).toBe("");
    });
  });
});
