import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

describe("useMediaQuery", () => {
  let matchMediaMock: MockedFunction<typeof window.matchMedia>;
  let listeners: { [key: string]: ((event: MediaQueryListEvent) => void)[] } =
    {};

  beforeEach(() => {
    listeners = {};

    matchMediaMock = vi.fn((query: string) => {
      const mediaQueryList = {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn((callback: (event: MediaQueryListEvent) => void) => {
          if (!listeners[query]) {
            listeners[query] = [];
          }
          listeners[query].push(callback);
        }),
        removeListener: vi.fn(
          (callback: (event: MediaQueryListEvent) => void) => {
            if (listeners[query]) {
              listeners[query] = listeners[query].filter(
                (cb) => cb !== callback
              );
            }
          }
        ),
        addEventListener: vi.fn(
          (event: string, callback: (event: MediaQueryListEvent) => void) => {
            if (event === "change") {
              if (!listeners[query]) {
                listeners[query] = [];
              }
              listeners[query].push(callback);
            }
          }
        ),
        removeEventListener: vi.fn(
          (event: string, callback: (event: MediaQueryListEvent) => void) => {
            if (event === "change" && listeners[query]) {
              listeners[query] = listeners[query].filter(
                (cb) => cb !== callback
              );
            }
          }
        ),
        dispatchEvent: vi.fn(),
      };
      return mediaQueryList as unknown as MediaQueryList;
    });

    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial match state", () => {
    matchMediaMock.mockReturnValueOnce({
      matches: true,
      media: "(max-width: 768px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(true);
  });

  it("should update when media query changes", () => {
    const query = "(max-width: 768px)";
    const { result } = renderHook(() => useMediaQuery(query));

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      if (listeners[query]) {
        listeners[query].forEach((callback) => {
          callback({ matches: true } as MediaQueryListEvent);
        });
      }
    });

    expect(result.current).toBe(true);
  });

  it("should clean up listeners on unmount", () => {
    const query = "(max-width: 768px)";
    const removeListenerSpy = vi.fn();
    const removeEventListenerSpy = vi.fn();

    matchMediaMock.mockReturnValueOnce({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: removeListenerSpy,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    const { unmount } = renderHook(() => useMediaQuery(query));

    unmount();

    // Should attempt to remove listener
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple media queries", () => {
    const { result: result1 } = renderHook(() =>
      useMediaQuery("(max-width: 768px)")
    );
    const { result: result2 } = renderHook(() =>
      useMediaQuery("(min-width: 1024px)")
    );

    expect(result1.current).toBe(false);
    expect(result2.current).toBe(false);

    // Change first query
    act(() => {
      if (listeners["(max-width: 768px)"]) {
        listeners["(max-width: 768px)"].forEach((callback) => {
          callback({ matches: true } as MediaQueryListEvent);
        });
      }
    });

    expect(result1.current).toBe(true);
    expect(result2.current).toBe(false);
  });

  it("should use addEventListener when addListener is not available", () => {
    const query = "(max-width: 768px)";
    const addEventListenerSpy = vi.fn();

    matchMediaMock.mockReturnValueOnce({
      matches: false,
      media: query,
      onchange: null,
      addListener: undefined,
      removeListener: undefined,
      addEventListener: addEventListenerSpy,
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    renderHook(() => useMediaQuery(query));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});
