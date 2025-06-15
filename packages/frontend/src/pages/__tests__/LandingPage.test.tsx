import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../LandingPage';

// Mock setup must be defined before vi.mock
vi.mock('@/lib/supabase', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  };
  
  return { supabase: mockSupabase };
});

// Get the mocked module
const { supabase: mockSupabase } = await vi.importMock<{ supabase: any }>('@/lib/supabase');

// Mock user for tests
const mockUser = {
  id: 'test-id',
  email: 'test@example.com',
};

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockSupabase.auth.getUser.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders landing page content for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('奈良県オープンデータ提供API')).toBeInTheDocument();
    });

    // Check for login/signup buttons
    expect(screen.getByRole('link', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'サインアップ' })).toBeInTheDocument();
    
    // Check for CTA button
    expect(screen.getByRole('link', { name: '今すぐ始める' })).toBeInTheDocument();
    
    // Check for API docs link
    expect(screen.getAllByText('APIドキュメントを見る')[0]).toBeInTheDocument();
  });

  it('renders landing page content for authenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('奈良県オープンデータ提供API')).toBeInTheDocument();
    });

    // Check for dashboard link and logout button
    expect(screen.getByRole('link', { name: 'ダッシュボード' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    
    // Check for dashboard CTA
    expect(screen.getByRole('link', { name: 'ダッシュボードへ' })).toBeInTheDocument();
  });

  it('handles logout correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('renders all feature cards', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('特徴')).toBeInTheDocument();
    });

    // Check for feature cards
    expect(screen.getByText('豊富なデータセット')).toBeInTheDocument();
    expect(screen.getByText('セキュアな認証')).toBeInTheDocument();
    expect(screen.getByText('高速なレスポンス')).toBeInTheDocument();
    expect(screen.getByText('柔軟な利用プラン')).toBeInTheDocument();
  });

  it('renders getting started steps', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('利用開始までの流れ')).toBeInTheDocument();
    });

    // Check for steps
    expect(screen.getByText('アカウント登録')).toBeInTheDocument();
    expect(screen.getByText('APIキーの取得')).toBeInTheDocument();
    expect(screen.getByText('APIの利用開始')).toBeInTheDocument();
  });

  it('updates UI when auth state changes', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    let authCallback: any;
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'ログイン' })).toBeInTheDocument();
    });

    // Simulate auth state change to logged in
    authCallback('SIGNED_IN', { user: mockUser });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'ダッシュボード' })).toBeInTheDocument();
    });
  });
});