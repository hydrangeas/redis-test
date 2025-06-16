import { RateLimitLog, CreateRateLimitLogProps } from '../rate-limit-log.entity';
import { UniqueEntityId } from '@/domain/shared/entity';
import { ErrorType } from '@/domain/errors/domain-error';

describe('RateLimitLog', () => {
  const validProps: CreateRateLimitLogProps = {
    userId: 'user-123',
    endpointId: 'endpoint-456',
    requestId: 'req-789',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    exceeded: false,
  };

  describe('create', () => {
    it('should create a RateLimitLog with valid props', () => {
      const result = RateLimitLog.create(validProps);

      expect(result.isSuccess).toBe(true);
      const log = result.getValue();
      expect(log.userId).toBe('user-123');
      expect(log.endpointId).toBe('endpoint-456');
      expect(log.requestId).toBe('req-789');
      expect(log.timestamp).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(log.exceeded).toBe(false);
    });

    it('should use current date if timestamp not provided', () => {
      const props = { ...validProps };
      delete props.timestamp;
      const before = new Date();
      
      const result = RateLimitLog.create(props);
      
      const after = new Date();
      expect(result.isSuccess).toBe(true);
      const log = result.getValue();
      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should default exceeded to false if not provided', () => {
      const props = { ...validProps };
      delete props.exceeded;
      
      const result = RateLimitLog.create(props);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().exceeded).toBe(false);
    });

    it('should fail with invalid userId', () => {
      const invalidCases = [
        { ...validProps, userId: '' },
        { ...validProps, userId: null as any },
        { ...validProps, userId: undefined as any },
        { ...validProps, userId: 123 as any },
      ];

      invalidCases.forEach(props => {
        const result = RateLimitLog.create(props);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_USER_ID');
        expect(result.getError().type).toBe(ErrorType.VALIDATION);
      });
    });

    it('should fail with invalid endpointId', () => {
      const invalidCases = [
        { ...validProps, endpointId: '' },
        { ...validProps, endpointId: null as any },
        { ...validProps, endpointId: undefined as any },
        { ...validProps, endpointId: 456 as any },
      ];

      invalidCases.forEach(props => {
        const result = RateLimitLog.create(props);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_ENDPOINT_ID');
        expect(result.getError().type).toBe(ErrorType.VALIDATION);
      });
    });

    it('should fail with invalid requestId', () => {
      const invalidCases = [
        { ...validProps, requestId: '' },
        { ...validProps, requestId: null as any },
        { ...validProps, requestId: undefined as any },
        { ...validProps, requestId: 789 as any },
      ];

      invalidCases.forEach(props => {
        const result = RateLimitLog.create(props);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_REQUEST_ID');
        expect(result.getError().type).toBe(ErrorType.VALIDATION);
      });
    });

    it('should create with custom id', () => {
      const customId = new UniqueEntityId('custom-id');
      const result = RateLimitLog.create(validProps, customId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id.value).toBe('custom-id');
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct from existing data', () => {
      const props = {
        id: 'existing-id',
        userId: 'user-123',
        endpointId: 'endpoint-456',
        requestId: 'req-789',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        exceeded: true,
      };

      const result = RateLimitLog.reconstruct(props);

      expect(result.isSuccess).toBe(true);
      const log = result.getValue();
      expect(log.id.value).toBe('existing-id');
      expect(log.userId).toBe('user-123');
      expect(log.endpointId).toBe('endpoint-456');
      expect(log.requestId).toBe('req-789');
      expect(log.timestamp).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(log.exceeded).toBe(true);
    });
  });

  describe('markAsExceeded', () => {
    it('should mark log as exceeded', () => {
      const result = RateLimitLog.create(validProps);
      const log = result.getValue();

      expect(log.exceeded).toBe(false);
      
      log.markAsExceeded();
      
      expect(log.exceeded).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired logs', () => {
      const result = RateLimitLog.create({
        ...validProps,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });
      const log = result.getValue();
      const currentTime = new Date('2024-01-01T00:05:01Z'); // 5 minutes 1 second later

      expect(log.isExpired(300, currentTime)).toBe(true); // 300 seconds = 5 minutes
    });

    it('should return false for non-expired logs', () => {
      const result = RateLimitLog.create({
        ...validProps,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });
      const log = result.getValue();
      const currentTime = new Date('2024-01-01T00:04:59Z'); // 4 minutes 59 seconds later

      expect(log.isExpired(300, currentTime)).toBe(false); // 300 seconds = 5 minutes
    });

    it('should use current time if not provided', () => {
      const result = RateLimitLog.create({
        ...validProps,
        timestamp: new Date(Date.now() - 301000), // 301 seconds ago
      });
      const log = result.getValue();

      expect(log.isExpired(300)).toBe(true);
    });
  });

  describe('getAgeInSeconds', () => {
    it('should calculate age correctly', () => {
      const result = RateLimitLog.create({
        ...validProps,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });
      const log = result.getValue();
      const currentTime = new Date('2024-01-01T00:05:30Z'); // 5 minutes 30 seconds later

      expect(log.getAgeInSeconds(currentTime)).toBe(330); // 5 * 60 + 30
    });

    it('should return 0 for logs created at current time', () => {
      const currentTime = new Date();
      const result = RateLimitLog.create({
        ...validProps,
        timestamp: currentTime,
      });
      const log = result.getValue();

      expect(log.getAgeInSeconds(currentTime)).toBe(0);
    });

    it('should use current time if not provided', () => {
      const timestamp = new Date(Date.now() - 10000); // 10 seconds ago
      const result = RateLimitLog.create({
        ...validProps,
        timestamp,
      });
      const log = result.getValue();

      const age = log.getAgeInSeconds();
      expect(age).toBeGreaterThanOrEqual(9);
      expect(age).toBeLessThanOrEqual(11); // Allow for small timing differences
    });
  });
});