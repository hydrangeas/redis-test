import { vi } from 'vitest';

interface SupabaseMockMethods {
  from: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

export function createSupabaseMock(): { mockClient: { from: ReturnType<typeof vi.fn> }; methods: SupabaseMockMethods } {
  const methods: SupabaseMockMethods = {
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
  const chainableObject = Object.create(null) as SupabaseMockMethods;

  // Add all methods to the chainable object
  (Object.keys(methods) as Array<keyof SupabaseMockMethods>).forEach((key) => {
    chainableObject[key] = methods[key];
    // Make each method return the chainable object by default
    methods[key].mockReturnValue(chainableObject);
  });

  // Special handling for select with options
  methods.select.mockImplementation((_fields?: string, _options?: { count?: 'exact'; head?: boolean }) => {
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
