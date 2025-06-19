import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "@/test/test-utils";
import { AuthForm } from "../AuthForm";
import { supabase } from "@/lib/supabase";
import type { MockAuthUIProps } from "@/test/types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase Auth UI React
vi.mock("@supabase/auth-ui-react", () => ({
  Auth: ({ providers, localization }: MockAuthUIProps) => (
    <div data-testid="supabase-auth">
      <div>Supabase Auth UI</div>
      {providers &&
        providers.map((provider: string) => (
          <button key={provider} data-testid={`provider-${provider}`}>
            {localization?.variables?.sign_in?.social_provider_text?.replace(
              "{{provider}}",
              provider
            ) || `Sign in with ${provider}`}
          </button>
        ))}
    </div>
  ),
}));

vi.mock("@supabase/auth-ui-shared", () => ({
  ThemeSupa: {},
}));

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED";
type AuthSession = { user: { id: string } } | null;
type AuthCallback = (event: AuthEvent, session: AuthSession) => void;

interface MockAuthListener {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
}

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the Supabase Auth UI component", () => {
    const mockAuthListener: MockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    renderWithRouter(<AuthForm />);

    expect(screen.getByTestId("supabase-auth")).toBeInTheDocument();
    expect(screen.getByText("Supabase Auth UI")).toBeInTheDocument();
  });

  it("should render Google and GitHub provider buttons", () => {
    const mockAuthListener: MockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    renderWithRouter(<AuthForm />);

    expect(screen.getByTestId("provider-google")).toBeInTheDocument();
    expect(screen.getByTestId("provider-github")).toBeInTheDocument();
    expect(screen.getByText("googleでログイン")).toBeInTheDocument();
    expect(screen.getByText("githubでログイン")).toBeInTheDocument();
  });

  it("should navigate to dashboard on successful sign in", async () => {
    let authCallback: AuthCallback | null = null;

    const mockAuthListener: MockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback) => {
        authCallback = callback as AuthCallback;
        return mockAuthListener as ReturnType<typeof supabase.auth.onAuthStateChange>;
      }
    );

    renderWithRouter(<AuthForm />);

    // Simulate successful sign in
    if (authCallback) {
      authCallback("SIGNED_IN", { user: { id: "test-user" } });
    }

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should not navigate on other auth events", async () => {
    let authCallback: AuthCallback | null = null;

    const mockAuthListener: MockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback) => {
        authCallback = callback as AuthCallback;
        return mockAuthListener as ReturnType<typeof supabase.auth.onAuthStateChange>;
      }
    );

    renderWithRouter(<AuthForm />);

    // Simulate other auth events
    if (authCallback) {
      authCallback("SIGNED_OUT", null);
      authCallback("TOKEN_REFRESHED", { user: { id: "test-user" } });
      authCallback("USER_UPDATED", { user: { id: "test-user" } });
    }

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should unsubscribe from auth listener on unmount", () => {
    const unsubscribeSpy = vi.fn();
    const mockAuthListener: MockAuthListener = {
      data: {
        subscription: {
          unsubscribe: unsubscribeSpy,
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    const { unmount } = renderWithRouter(<AuthForm />);

    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it("should have accessible container", () => {
    const mockAuthListener: MockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(
      mockAuthListener as ReturnType<typeof supabase.auth.onAuthStateChange>
    );

    const { container } = renderWithRouter(<AuthForm />);

    const authContainer = container.querySelector(".auth-container");
    expect(authContainer).toBeInTheDocument();
  });
});