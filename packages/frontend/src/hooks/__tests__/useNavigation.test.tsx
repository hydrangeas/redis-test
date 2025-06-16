import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { useNavigation } from "../useNavigation";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("useNavigation", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={["/test?query=value#hash"]}>
      {children}
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should navigate to a path", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.navigateTo("/new-path");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/new-path", {
      replace: false,
      state: undefined,
    });
  });

  it("should navigate with replace option", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.navigateTo("/new-path", { replace: true });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/new-path", {
      replace: true,
      state: undefined,
    });
  });

  it("should navigate with state", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    const state = { from: "/previous" };

    act(() => {
      result.current.navigateTo("/new-path", { state });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/new-path", {
      replace: false,
      state,
    });
  });

  it("should preserve query parameters when requested", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.navigateTo("/new-path", { preserveQuery: true });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/new-path?query=value", {
      replace: false,
      state: undefined,
    });
  });

  it("should go back in history", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.goBack();
    });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("should go forward in history", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.goForward();
    });

    expect(mockNavigate).toHaveBeenCalledWith(1);
  });

  it("should return current location info", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.currentPath).toBe("/test");
    expect(result.current.currentQuery).toBe("?query=value");
    expect(result.current.currentHash).toBe("#hash");
  });
});
