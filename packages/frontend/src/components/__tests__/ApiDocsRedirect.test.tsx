import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiDocsRedirect } from "../ApiDocsRedirect";

describe("ApiDocsRedirect", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: "" } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.unstubAllEnvs();
  });

  it("should redirect to development API docs URL in development mode", async () => {
    // Mock development mode
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_URL", "http://localhost:8000");

    render(<ApiDocsRedirect />);

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:8000/api-docs");
    });
  });

  it("should redirect to production API docs URL in production mode", async () => {
    // Mock production mode
    vi.stubEnv("DEV", false);

    render(<ApiDocsRedirect />);

    await waitFor(() => {
      expect(window.location.href).toBe("/api-docs");
    });
  });

  it("should use default API URL when VITE_API_URL is not set", async () => {
    // Mock development mode without VITE_API_URL
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_URL", "");

    render(<ApiDocsRedirect />);

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:8000/api-docs");
    });
  });

  it("should render loading state", () => {
    const { getByText } = render(<ApiDocsRedirect />);

    expect(getByText("APIドキュメントへリダイレクト中...")).toBeInTheDocument();
  });
});
