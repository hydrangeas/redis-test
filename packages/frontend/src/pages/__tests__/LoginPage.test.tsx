import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// Mock the dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
  },
}));

// Mock Supabase Auth UI components
jest.mock('@supabase/auth-ui-react', () => ({
  Auth: ({ providers, localization }: any) => (
    <div data-testid="supabase-auth-ui">
      <div>Auth UI Component</div>
      <div>Providers: {providers.join(', ')}</div>
      {localization && <div>Localized</div>}
    </div>
  ),
}));

jest.mock('@supabase/auth-ui-shared', () => ({
  ThemeSupa: {},
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: null,
    pathname: '/login',
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('ログイン')).toBeInTheDocument();
    expect(screen.getByText('奈良県オープンデータ提供APIへようこそ')).toBeInTheDocument();
    expect(screen.getByTestId('supabase-auth-ui')).toBeInTheDocument();
    expect(screen.getByText('Providers: google, github')).toBeInTheDocument();
  });

  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('redirects to dashboard when user is already authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('redirects to the previous page after login', async () => {
    const mockLocation = {
      state: { from: { pathname: '/api-docs' } },
      pathname: '/login',
    };

    jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue(mockLocation);

    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/api-docs', { replace: true });
    });
  });

  it('displays terms and privacy links', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const termsLink = screen.getByText('利用規約');
    const privacyLink = screen.getByText('プライバシーポリシー');

    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(termsLink).toHaveAttribute('target', '_blank');
    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(privacyLink).toHaveAttribute('target', '_blank');
  });

  it('sets the document title', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(document.title).toBe('ログイン - オープンデータ提供API');
  });

  it('subscribes to auth state changes on mount', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('unsubscribes from auth state changes on unmount', () => {
    const unsubscribeMock = jest.fn();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    const { unmount } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('returns null when user is authenticated but not loading', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Since the component returns null, the container should be empty
    expect(container.firstChild).toBeNull();
  });
});