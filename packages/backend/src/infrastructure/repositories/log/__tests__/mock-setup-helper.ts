import { vi } from 'vitest';

export function createSupabaseMock() {
  const methods: Record<string, any> = {
    from: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    delete: vi.fn(),
  };

  // Create a chainable mock
  const chainableObject: Record<string, any> = Object.create(null);

  // Add all methods to the chainable object
  Object.keys(methods).forEach((key) => {
    chainableObject[key] = methods[key];
    // Make each method return the chainable object by default
    methods[key].mockReturnValue(chainableObject);
  });

  // Special handling for select with options
  methods.select.mockImplementation((_fields?: string, _options?: any) => {
    // Still return the chainable object
    return chainableObject;
  });

  // Create the main mock client
  const mockClient = {
    from: vi.fn((_tableName: string) => {
      // Return the chainable object when from is called
      return chainableObject;
    }),
  };

  return { mockClient, methods: chainableObject };
}
