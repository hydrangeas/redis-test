import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { EventLogger, DomainEvent } from '../event-logger';
import { DI_TOKENS } from '../../di';

// モックドメインイベント
class TestEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly occurredAt: Date,
    public readonly userId: string,
    public readonly password?: string,
    public readonly apiKey?: string
  ) {}

  getEventName(): string {
    return 'TestEvent';
  }
}

describe('EventLogger', () => {
  let mockLogger: any;
  let eventLogger: EventLogger;

  beforeEach(() => {
    container.reset();
    
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    container.register(DI_TOKENS.Logger, {
      useValue: mockLogger,
    });

    eventLogger = new EventLogger(mockLogger);
  });

  describe('handle', () => {
    it('should log domain events', async () => {
      const event = new TestEvent(
        'evt-123',
        'agg-456',
        new Date('2025-01-14T12:00:00Z'),
        'user-789'
      );

      await eventLogger.handle(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [logData, message] = mockLogger.info.mock.calls[0];

      expect(message).toBe('Domain event: TestEvent');
      expect(logData.event).toMatchObject({
        name: 'TestEvent',
        eventId: 'evt-123',
        aggregateId: 'agg-456',
        occurredAt: event.occurredAt,
      });
      expect(logData.context).toBe('domain_event');
    });

    it('should sanitize sensitive data', async () => {
      const event = new TestEvent(
        'evt-123',
        'agg-456',
        new Date('2025-01-14T12:00:00Z'),
        'user-789',
        'secret-password',
        'secret-api-key'
      );

      await eventLogger.handle(event);

      const [logData] = mockLogger.info.mock.calls[0];
      const eventData = logData.event.data;

      expect(eventData.password).toBe('[REDACTED]');
      expect(eventData.apiKey).toBe('[REDACTED]');
      expect(eventData.userId).toBe('user-789'); // 非機密データは保持
    });

    it('should handle nested sensitive data', async () => {
      const complexEvent = {
        eventId: 'evt-123',
        aggregateId: 'agg-456',
        occurredAt: new Date('2025-01-14T12:00:00Z'),
        user: {
          id: 'user-123',
          password: 'secret',
          profile: {
            name: 'Test User',
            apiToken: 'secret-token',
          },
        },
        getEventName: () => 'ComplexEvent',
      } as DomainEvent;

      await eventLogger.handle(complexEvent);

      const [logData] = mockLogger.info.mock.calls[0];
      const eventData = logData.event.data;

      expect(eventData.user.password).toBe('[REDACTED]');
      expect(eventData.user.profile.apiToken).toBe('[REDACTED]');
      expect(eventData.user.id).toBe('user-123');
      expect(eventData.user.profile.name).toBe('Test User');
    });
  });
});