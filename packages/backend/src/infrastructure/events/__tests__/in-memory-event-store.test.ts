import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventStore } from '../in-memory-event-store';
import { DomainEvent } from '@/domain/shared/domain-event';

class TestEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: string
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'TestEvent';
  }
}

class AnotherEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly value: number
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'AnotherEvent';
  }
}

describe('InMemoryEventStore', () => {
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
  });

  describe('save and retrieve', () => {
    it('should save and retrieve events by aggregate ID', async () => {
      const event1 = new TestEvent('agg-1', 'data 1');
      const event2 = new TestEvent('agg-1', 'data 2');
      const event3 = new TestEvent('agg-2', 'data 3');

      await eventStore.save(event1);
      await eventStore.save(event2);
      await eventStore.save(event3);

      const agg1Events = await eventStore.getByAggregateId('agg-1');
      expect(agg1Events).toHaveLength(2);
      expect(agg1Events[0]).toBe(event1);
      expect(agg1Events[1]).toBe(event2);

      const agg2Events = await eventStore.getByAggregateId('agg-2');
      expect(agg2Events).toHaveLength(1);
      expect(agg2Events[0]).toBe(event3);
    });

    it('should retrieve events by event name', async () => {
      const testEvent1 = new TestEvent('agg-1', 'test 1');
      const testEvent2 = new TestEvent('agg-2', 'test 2');
      const anotherEvent = new AnotherEvent('agg-3', 42);

      await eventStore.save(testEvent1);
      await eventStore.save(testEvent2);
      await eventStore.save(anotherEvent);

      const testEvents = await eventStore.getByEventName('TestEvent');
      expect(testEvents).toHaveLength(2);
      expect(testEvents).toContain(testEvent1);
      expect(testEvents).toContain(testEvent2);

      const anotherEvents = await eventStore.getByEventName('AnotherEvent');
      expect(anotherEvents).toHaveLength(1);
      expect(anotherEvents[0]).toBe(anotherEvent);
    });

    it('should respect limit when retrieving by event name', async () => {
      for (let i = 0; i < 10; i++) {
        await eventStore.save(new TestEvent(`agg-${i}`, `data ${i}`));
      }

      const limitedEvents = await eventStore.getByEventName('TestEvent', 3);
      expect(limitedEvents).toHaveLength(3);
    });

    it('should return empty array for non-existent aggregate ID', async () => {
      const events = await eventStore.getByAggregateId('non-existent');
      expect(events).toEqual([]);
    });

    it('should return empty array for non-existent event name', async () => {
      const events = await eventStore.getByEventName('NonExistentEvent');
      expect(events).toEqual([]);
    });
  });

  describe('dead letter queue', () => {
    it('should save dead letter events', async () => {
      const event = new TestEvent('agg-1', 'failed event');
      const deadLetter = {
        event,
        error: 'Processing failed',
        timestamp: new Date(),
      };

      await eventStore.saveDeadLetter(deadLetter);

      const deadLetters = eventStore.getDeadLetters();
      expect(deadLetters).toHaveLength(1);
      expect(deadLetters[0]).toEqual(deadLetter);
    });

    it('should maintain separate storage for dead letters', async () => {
      const event = new TestEvent('agg-1', 'event');
      
      await eventStore.save(event);
      await eventStore.saveDeadLetter({
        event,
        error: 'Failed',
        timestamp: new Date(),
      });

      const normalEvents = await eventStore.getByAggregateId('agg-1');
      expect(normalEvents).toHaveLength(1);

      const deadLetters = eventStore.getDeadLetters();
      expect(deadLetters).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all events and dead letters', async () => {
      const event = new TestEvent('agg-1', 'test');
      
      await eventStore.save(event);
      await eventStore.saveDeadLetter({
        event,
        error: 'Error',
        timestamp: new Date(),
      });

      eventStore.clear();

      const events = await eventStore.getByAggregateId('agg-1');
      expect(events).toEqual([]);

      const deadLetters = eventStore.getDeadLetters();
      expect(deadLetters).toEqual([]);
    });
  });
});