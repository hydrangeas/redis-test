import { vi } from 'vitest';

export function createSupabaseMock() {
  const methods = {
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
  const chainableObject = Object.create(null);
  
  // Add all methods to the chainable object
  Object.keys(methods).forEach(key => {
    chainableObject[key] = methods[key];
    // Make each method return the chainable object by default
    methods[key].mockReturnValue(chainableObject);
  });
  
  // Special handling for select with options
  methods.select.mockImplementation((fields?: string, options?: any) => {
    // Still return the chainable object
    return chainableObject;
  });

  // Create the main mock client
  const mockClient = {
    from: vi.fn((tableName: string) => {
      // Return the chainable object when from is called
      return chainableObject;
    }),
  };

  return { mockClient, methods: chainableObject };
}