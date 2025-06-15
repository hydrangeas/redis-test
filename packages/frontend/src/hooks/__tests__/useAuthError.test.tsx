import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthError } from '../useAuthError';

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
  };
});

describe('useAuthError', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  beforeEach(() => {
    mockSearchParams.delete('error');
  });

  it('returns null when no error param exists', () => {
    const { result } = renderHook(() => useAuthError(), { wrapper });
    expect(result.current.error).toBeNull();
  });

  it('returns correct error message for auth_failed', () => {
    mockSearchParams.set('error', 'auth_failed');
    const { result } = renderHook(() => useAuthError(), { wrapper });
    expect(result.current.error).toBe('認証に失敗しました。もう一度お試しください。');
  });

  it('returns correct error message for provider_error', () => {
    mockSearchParams.set('error', 'provider_error');
    const { result } = renderHook(() => useAuthError(), { wrapper });
    expect(result.current.error).toBe('プロバイダーとの連携でエラーが発生しました。');
  });

  it('returns correct error message for unexpected', () => {
    mockSearchParams.set('error', 'unexpected');
    const { result } = renderHook(() => useAuthError(), { wrapper });
    expect(result.current.error).toBe('予期せぬエラーが発生しました。');
  });

  it('returns generic error message for unknown error code', () => {
    mockSearchParams.set('error', 'unknown_error');
    const { result } = renderHook(() => useAuthError(), { wrapper });
    expect(result.current.error).toBe('エラーが発生しました。');
  });

  it('clears error when clearError is called', () => {
    mockSearchParams.set('error', 'auth_failed');
    const { result, rerender } = renderHook(() => useAuthError(), { wrapper });
    
    expect(result.current.error).toBe('認証に失敗しました。もう一度お試しください。');
    
    result.current.clearError();
    rerender();
    
    expect(result.current.error).toBeNull();
  });
});