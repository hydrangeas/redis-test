/**
 * API Versioning Client Examples
 *
 * This file demonstrates how clients can specify API versions
 * in their requests using different methods.
 */

// Example 1: Using URL path versioning
async function getDataWithUrlVersion() {
  const response = await fetch('/api/v1/data/secure/319985/r5.json', {
    headers: {
      Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    },
  });

  // Response headers will include:
  // X-API-Version: 1
  // X-API-Deprecation-Warning: Version 1 is deprecated...

  return response.json();
}

// Example 2: Using Accept-Version header
async function getDataWithHeaderVersion() {
  const response = await fetch('/api/data/secure/319985/r5.json', {
    headers: {
      Authorization: 'Bearer YOUR_ACCESS_TOKEN',
      'Accept-Version': '2',
    },
  });

  // Response headers will include:
  // X-API-Version: 2

  return response.json();
}

// Example 3: Using X-API-Version header
async function getDataWithXApiVersion() {
  const response = await fetch('/api/data/secure/319985/r5.json', {
    headers: {
      Authorization: 'Bearer YOUR_ACCESS_TOKEN',
      'X-API-Version': '2.1',
    },
  });

  return response.json();
}

// Example 4: Using query parameter
async function getDataWithQueryVersion() {
  const response = await fetch('/api/data/secure/319985/r5.json?version=1', {
    headers: {
      Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    },
  });

  return response.json();
}

// Example 5: Handling version fallback
async function getDataWithUnsupportedVersion() {
  const response = await fetch('/api/data/secure/319985/r5.json', {
    headers: {
      Authorization: 'Bearer YOUR_ACCESS_TOKEN',
      'Accept-Version': '1.5', // Not directly supported
    },
  });

  // Response headers will include:
  // X-API-Version-Requested: 1.5
  // X-API-Version-Served: 1
  // X-API-Deprecation-Warning: Version 1 is deprecated...

  return response.json();
}

// Example 6: TypeScript client with version management
class ApiClient {
  private baseUrl: string;
  private token: string;
  private apiVersion: string;

  constructor(baseUrl: string, token: string, apiVersion = '2') {
    this.baseUrl = baseUrl;
    this.token = token;
    this.apiVersion = apiVersion;
  }

  async getData(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/data/${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Accept-Version': this.apiVersion,
      },
    });

    // Check for deprecation warnings
    const deprecationWarning = response.headers.get('X-API-Deprecation-Warning');
    if (deprecationWarning) {
      console.warn('API Deprecation:', deprecationWarning);
      console.warn('Deprecation Date:', response.headers.get('X-API-Deprecation-Date'));
      console.warn('More Info:', response.headers.get('X-API-Deprecation-Info'));
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.title} - ${error.detail}`);
    }

    return response.json();
  }

  // Get available API versions
  async getVersions(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/versions`);
    return response.json();
  }

  // Get features available in current version
  async getFeatures(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/features`, {
      headers: {
        'Accept-Version': this.apiVersion,
      },
    });
    return response.json();
  }
}

// Usage example
async function main() {
  const client = new ApiClient('https://api.example.com', 'YOUR_TOKEN', '2');

  try {
    // Get version information
    const versions = await client.getVersions();
    console.log('Available versions:', versions);
    // Output: { current: '2', supported: ['1', '2', '2.1'], deprecated: ['1'] }

    // Get features for current version
    const features = await client.getFeatures();
    console.log('Features:', features);
    // Output: { base: ['data_access', 'rate_limiting'], advanced: ['filtering', 'sorting'] }

    // Get data
    const data = await client.getData('secure/319985/r5.json');
    console.log('Data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

export { ApiClient };
