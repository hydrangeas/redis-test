import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import React from 'react';

// Example hook for testing MSW integration
const useApiData = (url: string) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};

describe('useApiData with MSW', () => {
  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useApiData('/api/secure/123/test.json'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      id: '123',
      filename: 'test.json',
      data: expect.objectContaining({
        title: 'Mock data for test.json',
        content: 'This is mock data from MSW',
        timestamp: expect.any(String),
      }),
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle 404 errors', async () => {
    const { result } = renderHook(() => useApiData('/api/secure/404/notfound.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('404');
  });

  it('should handle rate limit errors', async () => {
    // Override handler to always return rate limit error
    server.use(
      http.get('/api/secure/:id/:filename', () => {
        return HttpResponse.json(
          {
            type: 'https://example.com/errors/rate-limit-exceeded',
            title: 'Rate limit exceeded',
            status: 429,
            detail: 'API rate limit exceeded. Please try again later.',
            instance: '/secure/test/rate-limit.json',
          },
          { status: 429 }
        );
      })
    );

    const { result } = renderHook(() => useApiData('/api/secure/test/rate-limit.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('429');
  });

  it('should handle network errors', async () => {
    // Override handler to simulate network error
    server.use(
      http.get('/api/secure/:id/:filename', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useApiData('/api/secure/test/network-error.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle custom response data', async () => {
    // Override handler with custom response
    server.use(
      http.get('/api/secure/custom/data.json', () => {
        return HttpResponse.json({
          customField: 'Custom Value',
          items: [1, 2, 3],
          nested: {
            value: 'Nested Value',
          },
        });
      })
    );

    const { result } = renderHook(() => useApiData('/api/secure/custom/data.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      customField: 'Custom Value',
      items: [1, 2, 3],
      nested: {
        value: 'Nested Value',
      },
    });
  });
});