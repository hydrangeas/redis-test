import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import { useAuth } from '@/hooks/useAuth';

// Mock the hooks
jest.mock('@/hooks/useAuth');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('DashboardPage', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
  });

  it('renders loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders user information correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('test-user-123')).toBeInTheDocument();
      expect(screen.getByText('Tier 1 (無料)')).toBeInTheDocument();
    });
  });

  it('masks API key by default', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const apiKeyElement = screen.getByText(/sk_test_/);
      expect(apiKeyElement.textContent).toMatch(/sk_test_.*\.\.\./);
    });
  });

  it('toggles API key visibility', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const toggleButton = screen.getByLabelText('APIキーを表示');
      fireEvent.click(toggleButton);
    });

    expect(screen.getByLabelText('APIキーを隠す')).toBeInTheDocument();
  });

  it('copies API key to clipboard', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const copyButton = screen.getByLabelText('APIキーをコピー');
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText('APIキーをコピーしました')).toBeInTheDocument();
  });

  it('displays usage statistics', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('/api/data/**')).toBeInTheDocument();
      expect(screen.getByText('45 / 60 リクエスト')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('handles sign out correctly', async () => {
    const mockSignOut = jest.fn();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: mockSignOut,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const signOutButton = screen.getByText('ログアウト');
      fireEvent.click(signOutButton);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('navigates to API docs', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const apiDocsButton = screen.getByText('APIドキュメントを見る');
      fireEvent.click(apiDocsButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/api-docs');
  });

  it('sets the document title', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('ダッシュボード - オープンデータ提供API');
    });
  });

  it('shows proper accessibility attributes', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー情報')).toBeInTheDocument();
      expect(screen.getByLabelText('APIキー管理')).toBeInTheDocument();
      expect(screen.getByLabelText('使用状況')).toBeInTheDocument();
      expect(screen.getByLabelText('アクション')).toBeInTheDocument();
    });
  });
});