import { http, HttpResponse } from "msw";

// Define API endpoint mocks
export const handlers = [
  // Health check endpoint
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "healthy" });
  }),

  // Mock open data API endpoint
  http.get("/api/secure/:id/:filename", ({ params }) => {
    const { id, filename } = params;

    // Simulate rate limit exceeded
    if (Math.random() < 0.1) {
      return HttpResponse.json(
        {
          type: "https://example.com/errors/rate-limit-exceeded",
          title: "Rate limit exceeded",
          status: 429,
          detail: "API rate limit exceeded. Please try again later.",
          instance: `/secure/${id}/${filename}`,
        },
        { status: 429 }
      );
    }

    // Simulate not found
    if (id === "404" || filename === "notfound.json") {
      return HttpResponse.json(
        {
          type: "https://example.com/errors/not-found",
          title: "Resource not found",
          status: 404,
          detail: "The requested data file does not exist",
          instance: `/secure/${id}/${filename}`,
        },
        { status: 404 }
      );
    }

    // Return mock data
    return HttpResponse.json({
      id,
      filename,
      data: {
        title: `Mock data for ${filename}`,
        content: "This is mock data from MSW",
        timestamp: new Date().toISOString(),
      },
    });
  }),

  // Mock authentication endpoint
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { provider: string };

    if (!body.provider) {
      return HttpResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      redirectUrl: `https://supabase.com/auth/${body.provider}`,
    });
  }),

  // Mock logout endpoint
  http.post("/api/auth/logout", () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock user info endpoint
  http.get("/api/auth/user", ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json({
      id: "test-user-id",
      email: "test@example.com",
      tier: "tier1",
      rateLimit: 60,
    });
  }),
];
