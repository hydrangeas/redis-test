import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthForm } from '../AuthForm';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

// Mock Supabase Auth UI components
vi.mock('@supabase/auth-ui-react', () => ({
  Auth: ({ providers, localization }: { providers?: string[]; localization?: any }) => (
    <div data-testid="supabase-auth">
      <div data-testid="providers">{providers?.join(', ')}</div>
      <div data-testid="localization">{localization?.variables?.sign_in?.social_provider_text}</div>
    </div>
  ),
}));

vi.mock('@supabase/auth-ui-shared', () => ({
  ThemeSupa: {},
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders auth form with correct providers', () => {
    render(
      <BrowserRouter>
        <AuthForm />
      </BrowserRouter>
    );

    const authComponent = screen.getByTestId('supabase-auth');
    expect(authComponent).toBeInTheDocument();

    const providers = screen.getByTestId('providers');
    expect(providers).toHaveTextContent('google, github');
  });

  it('displays Japanese localization', () => {
    render(
      <BrowserRouter>
        <AuthForm />
      </BrowserRouter>
    );

    const localization = screen.getByTestId('localization');
    expect(localization).toHaveTextContent('{{provider}}でログイン');
  });

  it('sets up auth state change listener', async () => {
    const supabaseMock = await vi.importMock<{ supabase: any }>('@/lib/supabase');
    
    render(
      <BrowserRouter>
        <AuthForm />
      </BrowserRouter>
    );

    expect(supabaseMock.supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('cleans up auth listener on unmount', async () => {
    const unsubscribeMock = vi.fn();
    const supabaseMock = await vi.importMock<{ supabase: any }>('@/lib/supabase');
    supabaseMock.supabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    const { unmount } = render(
      <BrowserRouter>
        <AuthForm />
      </BrowserRouter>
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});