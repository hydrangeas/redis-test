import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

// Mock supabase module
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Import supabase after mock
import { supabase } from "@/lib/supabase";

interface MockSupabase {
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    signInWithOAuth: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
}

const mockSupabase = supabase as unknown as MockSupabase;

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state initially", () => {
    // Mock getSession to never resolve
    mockSupabase.auth.getSession.mockImplementation(
      () => new Promise(() => {})
    );

    render(<App />);

    expect(screen.getByText("ページを読み込み中...")).toBeInTheDocument();
  });

  it("should render app after loading", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("ページを読み込み中...")).not.toBeInTheDocument();
    });
  });

  it("should handle auth check error gracefully", async () => {
    mockSupabase.auth.getSession.mockRejectedValue(
      new Error("Auth error")
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("ページを読み込み中...")).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Auth state error:",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it("should unsubscribe from auth listener on unmount", async () => {
    const unsubscribeSpy = vi.fn();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeSpy,
        },
      },
    });

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("ページを読み込み中...")).not.toBeInTheDocument();
    });

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
