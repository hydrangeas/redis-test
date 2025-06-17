import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";

// Create a custom render function that includes providers
export function renderWithRouter(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// Mock navigation hook
export const createMockNavigate = () => {
  const navigate = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  vi.mocked(require("react-router-dom").useNavigate).mockReturnValue(navigate);
  return navigate;
};

// Re-export everything from testing library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
