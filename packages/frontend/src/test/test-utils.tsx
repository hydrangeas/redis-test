import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";

// Mock AuthProvider for tests
export const MockAuthProvider = ({ children, user = null, loading = false }: { 
  children: React.ReactNode;
  user?: User | null;
  loading?: boolean;
}) => {
  const value = {
    user,
    loading,
    signOut: vi.fn(),
  };
  
  // Create the context
  const AuthContext = React.createContext(value);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

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
