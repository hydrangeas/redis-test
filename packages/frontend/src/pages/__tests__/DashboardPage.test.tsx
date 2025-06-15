import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/test-utils';
import { DashboardPage } from '../DashboardPage';
import { supabase } from '@/lib/supabase';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to home if user is not authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display user information when authenticated', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier2' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/tier2/i)).toBeInTheDocument();
    });
  });

  it('should display rate limit information based on tier', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier1' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/60回\/分/)).toBeInTheDocument();
    });
  });

  it('should handle tier2 rate limits correctly', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier2' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/120回\/分/)).toBeInTheDocument();
    });
  });

  it('should handle tier3 rate limits correctly', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier3' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/300回\/分/)).toBeInTheDocument();
    });
  });

  it('should handle logout successfully', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier1' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('ログアウト');
    await user.click(logoutButton);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should handle logout error gracefully', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier1' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: new Error('Logout failed'),
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('ログアウト');
    await user.click(logoutButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('ログアウトに失敗しました。もう一度お試しください。');
    });

    alertSpy.mockRestore();
  });

  it('should show loading state while logging out', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier1' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    // Make signOut never resolve to test loading state
    vi.mocked(supabase.auth.signOut).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('ログアウト');
    await user.click(logoutButton);

    expect(logoutButton).toBeDisabled();
    expect(screen.getByText('ログアウト中...')).toBeInTheDocument();
  });

  it('should show loading state while checking auth', () => {
    // Mock getUser to never resolve
    vi.mocked(supabase.auth.getUser).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<DashboardPage />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should default to tier1 if no tier is set', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {}, // No tier set
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/tier1/i)).toBeInTheDocument();
      expect(screen.getByText(/60回\/分/)).toBeInTheDocument();
    });
  });

  it('should have accessible structure', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: { tier: 'tier1' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      // Check for main heading
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('ダッシュボード');

      // Check for user info section
      const userInfoHeading = screen.getByRole('heading', { level: 2, name: 'ユーザー情報' });
      expect(userInfoHeading).toBeInTheDocument();

      // Check for main content
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });
});