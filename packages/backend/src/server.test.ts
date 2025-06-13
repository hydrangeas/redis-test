import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

let server: FastifyInstance;

beforeAll(async () => {
  server = fastify({ logger: false });
  
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

describe('Server', () => {
  it('should respond to health check', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });
    
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});