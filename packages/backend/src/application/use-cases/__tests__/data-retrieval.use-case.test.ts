import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { DataRetrievalUseCase } from '../data-retrieval.use-case';
import { IOpenDataRepository } from '@/domain/data/interfaces/open-data-repository.interface';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { DataPath } from '@/domain/data/value-objects/data-path';
import { OpenDataResource } from '@/domain/data/entities/open-data-resource.entity';
import { ResourceId } from '@/domain/data/value-objects/resource-id';
import { ResourceMetadata } from '@/domain/data/value-objects/resource-metadata';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { DataAccessRequested } from '@/domain/data/events/data-access-requested.event';
import { DataRetrieved } from '@/domain/data/events/data-retrieved.event';
import { DataResourceNotFound } from '@/domain/data/events/data-resource-not-found.event';
import { DataAccessDenied } from '@/domain/data/events/data-access-denied.event';
import { Logger } from 'pino';

describe('DataRetrievalUseCase', () => {
  let useCase: DataRetrievalUseCase;
  let mockDataRepository: IOpenDataRepository;
  let mockEventBus: IEventBus;
  let mockLogger: Logger;

  beforeEach(() => {
    // モックの初期化
    mockDataRepository = {
      findByPath: vi.fn(),
      findById: vi.fn(),
      getContent: vi.fn(),
      listByDirectory: vi.fn(),
      exists: vi.fn(),
      updateMetadata: vi.fn(),
      getCached: vi.fn(),
      cache: vi.fn(),
      clearCache: vi.fn(),
    };

    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
    } as any;

    useCase = new DataRetrievalUseCase(mockDataRepository, mockEventBus, mockLogger);
  });

  describe('retrieveData', () => {
    it('should retrieve data successfully', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date(),
        etag: '"test-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );
      const content = { test: 'data' };

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );
      (mockDataRepository.getContent as MockedFunction<any>).mockResolvedValue(
        Result.ok(content)
      );

      // Act
      const result = await useCase.retrieveData(path);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(content);

      // Verify events were published
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          getEventName: expect.any(Function),
        })
      );

      // Check that the first event is DataAccessRequested
      const firstCall = (mockEventBus.publish as MockedFunction<any>).mock.calls[0][0];
      expect(firstCall.getEventName()).toBe('DataAccessRequested');

      // Check that the second event is DataRetrieved
      const secondCall = (mockEventBus.publish as MockedFunction<any>).mock.calls[1][0];
      expect(secondCall.getEventName()).toBe('DataRetrieved');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          path,
          size: 1024,
          contentType: 'application/json',
        }),
        'Data retrieved successfully'
      );
    });

    it('should handle invalid path', async () => {
      // Arrange
      const invalidPath = 'invalid/path';

      // Act
      const result = await useCase.retrieveData(invalidPath);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('INVALID_PATH_FORMAT');

      // Verify DataAccessDenied event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          getEventName: expect.any(Function),
        })
      );

      const event = (mockEventBus.publish as MockedFunction<any>).mock.calls[0][0];
      expect(event.getEventName()).toBe('DataAccessDenied');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { path: invalidPath },
        'Invalid data path'
      );
    });

    it('should handle resource not found', async () => {
      // Arrange
      const path = 'secure/missing.json';
      const dataPath = DataPath.create(path).getValue();
      const notFoundError = new DomainError(
        'RESOURCE_NOT_FOUND',
        'Resource not found',
        ErrorType.NOT_FOUND
      );

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.fail(notFoundError)
      );

      // Act
      const result = await useCase.retrieveData(path);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('RESOURCE_NOT_FOUND');

      // Verify events
      const calls = (mockEventBus.publish as MockedFunction<any>).mock.calls;
      expect(calls[0][0].getEventName()).toBe('DataAccessRequested');
      expect(calls[1][0].getEventName()).toBe('DataResourceNotFound');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle content retrieval failure', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date(),
        etag: '"test-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );
      (mockDataRepository.getContent as MockedFunction<any>).mockResolvedValue(
        Result.fail(new DomainError('READ_ERROR', 'Failed to read file', ErrorType.INTERNAL))
      );

      // Act
      const result = await useCase.retrieveData(path);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('READ_ERROR');
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const unexpectedError = new Error('Unexpected error');

      (mockDataRepository.findByPath as MockedFunction<any>).mockRejectedValue(unexpectedError);

      // Act
      const result = await useCase.retrieveData(path);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('DATA_RETRIEVAL_ERROR');
      expect(result.error!.type).toBe(ErrorType.INTERNAL);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          path,
          error: 'Unexpected error',
        }),
        'Unexpected error in data retrieval'
      );
    });
  });

  describe('retrieveMetadata', () => {
    it('should retrieve metadata successfully', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 2048,
        lastModified: new Date('2024-01-01'),
        etag: '"metadata-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );

      // Act
      const result = await useCase.retrieveMetadata(path);

      // Assert
      expect(result.isSuccess).toBe(true);
      const metadataResult = result.getValue();
      expect(metadataResult.size).toBe(2048);
      expect(metadataResult.lastModified).toEqual(new Date('2024-01-01'));
      expect(metadataResult.etag).toBe('"metadata-etag"');
      expect(metadataResult.contentType).toBe('application/json');
    });

    it('should handle invalid path for metadata', async () => {
      // Arrange
      const invalidPath = 'invalid/path';

      // Act
      const result = await useCase.retrieveMetadata(invalidPath);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error!.code).toBe('INVALID_PATH_FORMAT');
    });
  });

  describe('retrieveDataWithETag', () => {
    it('should return not modified when ETag matches', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const etag = '"matching-etag"';
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date(),
        etag: '"matching-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );

      // Act
      const result = await useCase.retrieveDataWithETag(path, etag);

      // Assert
      expect(result.isSuccess).toBe(true);
      const response = result.getValue();
      expect(response.notModified).toBe(true);
      expect(response.newEtag).toBe('"matching-etag"');
      expect(response.data).toBeUndefined();
    });

    it('should return data when ETag does not match', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const oldEtag = '"old-etag"';
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date(),
        etag: '"new-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );
      const content = { updated: 'data' };

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );
      (mockDataRepository.getContent as MockedFunction<any>).mockResolvedValue(
        Result.ok(content)
      );

      // Act
      const result = await useCase.retrieveDataWithETag(path, oldEtag);

      // Assert
      expect(result.isSuccess).toBe(true);
      const response = result.getValue();
      expect(response.notModified).toBe(false);
      expect(response.newEtag).toBe('"new-etag"');
      expect(response.data).toEqual(content);

      // Verify DataRetrieved event was published
      const event = (mockEventBus.publish as MockedFunction<any>).mock.calls[0][0];
      expect(event.getEventName()).toBe('DataRetrieved');
    });
  });

  describe('retrieveDataIfModified', () => {
    it('should return not modified when resource is not modified since', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const ifModifiedSince = new Date('2024-01-02');
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date('2024-01-01'), // Older than ifModifiedSince
        etag: '"test-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );

      // Act
      const result = await useCase.retrieveDataIfModified(path, ifModifiedSince);

      // Assert
      expect(result.isSuccess).toBe(true);
      const response = result.getValue();
      expect(response.notModified).toBe(true);
      expect(response.lastModified).toEqual(new Date('2024-01-01'));
      expect(response.data).toBeUndefined();
    });

    it('should return data when resource is modified since', async () => {
      // Arrange
      const path = 'secure/319985/r5.json';
      const ifModifiedSince = new Date('2024-01-01');
      const dataPath = DataPath.create(path).getValue();
      const resourceId = ResourceId.generate();
      const metadata = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date('2024-01-02'), // Newer than ifModifiedSince
        etag: '"test-etag"',
        contentType: 'application/json',
      }).getValue();
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date(),
        new Date()
      );
      const content = { modified: 'data' };

      (mockDataRepository.findByPath as MockedFunction<any>).mockResolvedValue(
        Result.ok(resource)
      );
      (mockDataRepository.getContent as MockedFunction<any>).mockResolvedValue(
        Result.ok(content)
      );

      // Act
      const result = await useCase.retrieveDataIfModified(path, ifModifiedSince);

      // Assert
      expect(result.isSuccess).toBe(true);
      const response = result.getValue();
      expect(response.notModified).toBe(false);
      expect(response.lastModified).toEqual(new Date('2024-01-02'));
      expect(response.data).toEqual(content);

      // Verify DataRetrieved event was published
      const event = (mockEventBus.publish as MockedFunction<any>).mock.calls[0][0];
      expect(event.getEventName()).toBe('DataRetrieved');
    });
  });
});