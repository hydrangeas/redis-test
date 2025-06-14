import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('HomePage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders the hero section with correct content', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('奈良県オープンデータ提供API')).toBeInTheDocument();
    expect(
      screen.getByText(/奈良県の公式オープンデータを簡単に利用できるAPIサービスです/)
    ).toBeInTheDocument();
  });

  it('shows login and API docs buttons when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('ログインまたはサインアップ')).toBeInTheDocument();
    expect(screen.getByLabelText('APIドキュメントを表示')).toBeInTheDocument();
    expect(screen.queryByLabelText('ダッシュボードへ移動')).not.toBeInTheDocument();
  });

  it('shows dashboard button when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('ダッシュボードへ移動')).toBeInTheDocument();
    expect(screen.queryByLabelText('ログインまたはサインアップ')).not.toBeInTheDocument();
  });

  it('renders all feature cards', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('豊富なデータ')).toBeInTheDocument();
    expect(screen.getByText('セキュアなアクセス')).toBeInTheDocument();
    expect(screen.getByText('高速レスポンス')).toBeInTheDocument();
    expect(screen.getByText('柔軟な料金プラン')).toBeInTheDocument();
  });

  it('renders all pricing tiers', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Tier 1')).toBeInTheDocument();
    expect(screen.getByText('Tier 2')).toBeInTheDocument();
    expect(screen.getByText('Tier 3')).toBeInTheDocument();
    expect(screen.getByText('60リクエスト/分')).toBeInTheDocument();
    expect(screen.getByText('120リクエスト/分')).toBeInTheDocument();
    expect(screen.getByText('300リクエスト/分')).toBeInTheDocument();
  });

  it('hides CTA section signup button when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(
      screen.queryByLabelText('無料プランでサインアップ')
    ).not.toBeInTheDocument();
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
        <HomePage />
      </BrowserRouter>
    );

    expect(document.title).toBe('奈良県オープンデータ提供API');
  });

  it('has proper accessibility attributes', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('メインコンテンツ')).toBeInTheDocument();
    expect(screen.getByLabelText('サービスの特徴')).toBeInTheDocument();
    expect(screen.getByLabelText('料金プラン')).toBeInTheDocument();
    expect(screen.getByLabelText('コール・トゥ・アクション')).toBeInTheDocument();
  });
});