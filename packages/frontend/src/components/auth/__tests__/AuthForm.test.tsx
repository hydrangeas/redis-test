import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@/test/test-utils';
import { AuthForm } from '../AuthForm';
import { supabase } from '@/lib/supabase';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase Auth UI React
vi.mock('@supabase/auth-ui-react', () => ({
  Auth: ({ onlyThirdPartyProviders, providers, localization }: any) => (
    <div data-testid="supabase-auth">
      <div>Supabase Auth UI</div>
      {providers && providers.map((provider: string) => (
        <button key={provider} data-testid={`provider-${provider}`}>
          {localization?.variables?.sign_in?.social_provider_text?.replace('{{provider}}', provider) || `Sign in with ${provider}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@supabase/auth-ui-shared', () => ({
  ThemeSupa: {},
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Supabase Auth UI component', () => {
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(mockAuthListener as any);

    renderWithRouter(<AuthForm />);

    expect(screen.getByTestId('supabase-auth')).toBeInTheDocument();
    expect(screen.getByText('Supabase Auth UI')).toBeInTheDocument();
  });

  it('should render Google and GitHub provider buttons', () => {
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(mockAuthListener as any);

    renderWithRouter(<AuthForm />);

    expect(screen.getByTestId('provider-google')).toBeInTheDocument();
    expect(screen.getByTestId('provider-github')).toBeInTheDocument();
    expect(screen.getByText('googleでログイン')).toBeInTheDocument();
    expect(screen.getByText('githubでログイン')).toBeInTheDocument();
  });

  it('should navigate to dashboard on successful sign in', async () => {
    let authCallback: ((event: string, session: any) => void) | null = null;
    
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authCallback = callback;
      return mockAuthListener as any;
    });

    renderWithRouter(<AuthForm />);

    // Simulate successful sign in
    if (authCallback) {
      authCallback('SIGNED_IN', { user: { id: 'test-user' } });
    }

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should not navigate on other auth events', async () => {
    let authCallback: ((event: string, session: any) => void) | null = null;
    
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authCallback = callback;
      return mockAuthListener as any;
    });

    renderWithRouter(<AuthForm />);

    // Simulate other auth events
    if (authCallback) {
      authCallback('SIGNED_OUT', null);
      authCallback('TOKEN_REFRESHED', { user: { id: 'test-user' } });
      authCallback('USER_UPDATED', { user: { id: 'test-user' } });
    }

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should unsubscribe from auth listener on unmount', () => {
    const unsubscribeSpy = vi.fn();
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: unsubscribeSpy,
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(mockAuthListener as any);

    const { unmount } = renderWithRouter(<AuthForm />);

    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('should have accessible container', () => {
    const mockAuthListener = {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue(mockAuthListener as any);

    const { container } = renderWithRouter(<AuthForm />);

    const authContainer = container.querySelector('.auth-container');
    expect(authContainer).toBeInTheDocument();
  });
});