import { describe, it, expect } from 'vitest';
import { UserAuthenticated } from '../user-authenticated.event';

describe('UserAuthenticated', () => {
  it('should create immutable event with required properties', () => {
    const aggregateId = 'user-123';
    const eventVersion = 1;
    const userId = 'user-123';
    const provider = 'google';
    const tier = 'tier2';

    const event = new UserAuthenticated(
      aggregateId,
      eventVersion,
      userId,
      provider,
      tier
    );

    expect(event.aggregateId).toBe(aggregateId);
    expect(event.eventVersion).toBe(eventVersion);
    expect(event.userId).toBe(userId);
    expect(event.provider).toBe(provider);
    expect(event.tier).toBe(tier);
    expect(event.sessionId).toBeUndefined();
    expect(event.ipAddress).toBeUndefined();
    expect(event.userAgent).toBeUndefined();
  });

  it('should create immutable event with all properties', () => {
    const aggregateId = 'user-123';
    const eventVersion = 1;
    const userId = 'user-123';
    const provider = 'google';
    const tier = 'tier2';
    const sessionId = 'session-456';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0...';

    const event = new UserAuthenticated(
      aggregateId,
      eventVersion,
      userId,
      provider,
      tier,
      sessionId,
      ipAddress,
      userAgent
    );

    expect(event.userId).toBe(userId);
    expect(event.provider).toBe(provider);
    expect(event.tier).toBe(tier);
    expect(event.sessionId).toBe(sessionId);
    expect(event.ipAddress).toBe(ipAddress);
    expect(event.userAgent).toBe(userAgent);
  });

  it('should have correct event name', () => {
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'github',
      'tier1'
    );

    expect(event.getEventName()).toBe('UserAuthenticated');
  });

  it('should be immutable', () => {
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier2'
    );

    // 不変性のテスト
    expect(() => {
      (event as any).userId = 'other-user';
    }).toThrow();

    expect(() => {
      (event as any).provider = 'other-provider';
    }).toThrow();

    expect(() => {
      (event as any).tier = 'tier3';
    }).toThrow();
  });

  it('should include metadata', () => {
    const aggregateId = 'user-123';
    const eventVersion = 1;
    const event = new UserAuthenticated(
      aggregateId,
      eventVersion,
      'user-123',
      'github',
      'tier1'
    );

    const metadata = event.getMetadata();
    
    expect(metadata.eventName).toBe('UserAuthenticated');
    expect(metadata.aggregateId).toBe(aggregateId);
    expect(metadata.eventVersion).toBe(eventVersion);
    expect(metadata.eventId).toBeDefined();
    expect(metadata.occurredAt).toBeDefined();
  });

  it('should have unique event IDs', () => {
    const event1 = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier1'
    );

    const event2 = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier1'
    );

    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('should have occurred timestamp', () => {
    const beforeCreation = new Date();
    
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier1'
    );

    const afterCreation = new Date();

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should return correct data', () => {
    const userId = 'user-123';
    const provider = 'google';
    const tier = 'tier2';
    const sessionId = 'session-456';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0...';

    const event = new UserAuthenticated(
      'user-123',
      1,
      userId,
      provider,
      tier,
      sessionId,
      ipAddress,
      userAgent
    );

    const data = event.getData();

    expect(data).toEqual({
      userId,
      provider,
      tier,
      sessionId,
      ipAddress,
      userAgent,
    });
  });

  it('should return partial data when optional fields are not provided', () => {
    const userId = 'user-123';
    const provider = 'google';
    const tier = 'tier1';

    const event = new UserAuthenticated(
      'user-123',
      1,
      userId,
      provider,
      tier
    );

    const data = event.getData();

    expect(data).toEqual({
      userId,
      provider,
      tier,
      sessionId: undefined,
      ipAddress: undefined,
      userAgent: undefined,
    });
  });
});