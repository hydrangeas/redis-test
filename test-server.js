// Minimal test server for data API
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fastify from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'packages/backend/.env.local') });

const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Simple auth middleware
app.decorate('authenticate', async function (request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        type: 'https://example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Missing or invalid authorization header',
        instance: request.url
      });
    }
    
    // For testing, just accept any token
    request.user = {
      userId: { value: 'test-user' },
      tier: { level: 'tier1' }
    };
  } catch (err) {
    return reply.code(401).send({
      type: 'https://example.com/errors/unauthorized',
      title: 'Unauthorized', 
      status: 401,
      detail: 'Invalid token',
      instance: request.url
    });
  }
});

// Data API routes
app.get('/api/data/*', {
  preHandler: app.authenticate
}, async (request, reply) => {
  const dataPath = request.params['*'];
  const dataDirectory = process.env.DATA_DIRECTORY || join(process.cwd(), 'data');
  
  request.log.info({ dataPath, dataDirectory, user: request.user }, 'Data access request');

  // Validate path
  if (!dataPath || !dataPath.endsWith('.json')) {
    return reply.code(400).send({
      type: 'https://example.com/errors/invalid-path',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid data path format',
      instance: request.url
    });
  }

  // Prevent path traversal
  if (dataPath.includes('..')) {
    return reply.code(400).send({
      type: 'https://example.com/errors/invalid-path',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid path',
      instance: request.url
    });
  }

  try {
    const filePath = join(dataDirectory, dataPath);
    request.log.info({ filePath }, 'Checking file');
    
    const stats = await fs.stat(filePath);
    
    if (!stats.isFile()) {
      return reply.code(404).send({
        type: 'https://example.com/errors/not-found',
        title: 'Resource not found',
        status: 404,
        detail: 'The requested data file does not exist',
        instance: request.url
      });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Generate ETag
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const etag = `"${hash}"`;
    
    // Set headers
    reply.headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'ETag': etag,
      'Last-Modified': stats.mtime.toUTCString(),
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': '59',
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 3600
    });

    // Handle conditional requests
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      return reply.code(304).send();
    }

    return reply.send(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return reply.code(404).send({
        type: 'https://example.com/errors/not-found',
        title: 'Resource not found',
        status: 404,
        detail: 'The requested data file does not exist',
        instance: request.url
      });
    }

    request.log.error({ error: err, dataPath }, 'Failed to read data file');
    
    return reply.code(500).send({
      type: 'https://example.com/errors/internal-error',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: request.url
    });
  }
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server started on http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();