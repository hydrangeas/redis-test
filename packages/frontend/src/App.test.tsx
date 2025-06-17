import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { supabase } from "@/lib/supabase";

// Set up mocks before component imports
vi.mock("@/lib/supabase");

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state initially", () => {
    // Mock getSession to never resolve
    vi.mocked(supabase.auth.getSession).mockImplementation(
      () => new Promise(() => {})
    );

    render(<App />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(screen.getByRole("generic")).toHaveClass("auth-callback-container");
  });

  it("should render app after loading", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });
  });

  it("should handle auth check error gracefully", async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(
      new Error("Auth error")
    );

    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Auth check error:",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it("should unsubscribe from auth listener on unmount", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const unsubscribeSpy = vi.fn();
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: unsubscribeSpy,
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
