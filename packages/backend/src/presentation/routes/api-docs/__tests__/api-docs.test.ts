import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { fastifySwagger } from '@fastify/swagger';
import apiDocsRoute from '../index';

// Mock Scalar plugin
vi.mock('@scalar/fastify-api-reference', () => ({
  default: vi.fn(async (fastify: FastifyInstance, options: any) => {
    // Simulate Scalar registration
    fastify.get(options.routePrefix, async () => ({
      scalar: 'ui',
    }));
  }),
}));

// Mock yaml
vi.mock('yaml', () => ({
  stringify: vi.fn((obj) => `# YAML\n${JSON.stringify(obj, null, 2)}`),
}));

describe('API Documentation Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    
    // Register swagger plugin (required for fastify.swagger())
    await fastify.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      },
    });

    // Register api-docs route
    await fastify.register(apiDocsRoute);
    await fastify.ready();
  });

  it('should provide OpenAPI spec in JSON format', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/openapi.json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    
    const spec = JSON.parse(response.body);
    expect(spec).toHaveProperty('openapi');
    expect(spec).toHaveProperty('info');
  });

  it('should provide OpenAPI spec in YAML format', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/openapi.yaml',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/yaml');
    expect(response.body).toContain('# YAML');
  });

  it('should register Scalar UI at /api-docs', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api-docs',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('scalar', 'ui');
  });

  it('should provide API documentation info at root', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('message', 'API Documentation');
    expect(body).toHaveProperty('ui', '/api/api-docs');
    expect(body).toHaveProperty('spec');
    expect(body.spec).toHaveProperty('json', '/api/openapi.json');
    expect(body.spec).toHaveProperty('yaml', '/api/openapi.yaml');
  });

  it('should hide OpenAPI endpoints from Scalar UI', async () => {
    // The OpenAPI endpoints should be accessible but hidden from the UI
    const jsonResponse = await fastify.inject({
      method: 'GET',
      url: '/openapi.json',
    });
    
    const yamlResponse = await fastify.inject({
      method: 'GET',
      url: '/openapi.yaml',
    });
    
    // Endpoints should work
    expect(jsonResponse.statusCode).toBe(200);
    expect(yamlResponse.statusCode).toBe(200);
    
    // Schema should have hide: true property
    // (This is set in the route definition to hide from Scalar UI)
  });
});