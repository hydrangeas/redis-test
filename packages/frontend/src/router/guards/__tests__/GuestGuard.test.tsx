import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GuestGuard } from "../GuestGuard";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("GuestGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when authentication is being checked", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("should redirect to dashboard when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123", email: "test@example.com" },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("should render guest content when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
