import { describe, it, expect, beforeEach } from 'vitest';
import { FileMetadata } from '../file-metadata';
import { FilePath } from '../file-path';
import { FileSize } from '../file-size';
import { MimeType } from '../mime-type';
import { ValidationError } from '../../../errors/validation-error';

describe('FileMetadata', () => {
  let validPath: FilePath;
  let validSize: FileSize;
  let validMimeType: MimeType;
  let validDate: Date;

  beforeEach(() => {
    validPath = new FilePath('data/users/profile.json');
    validSize = new FileSize(1024);
    validMimeType = new MimeType('application/json');
    validDate = new Date('2024-01-01T00:00:00Z');
  });

  describe('constructor', () => {
    it('should create valid file metadata', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate, '"abc123"');

      expect(metadata.path).toBe(validPath);
      expect(metadata.size).toBe(validSize);
      expect(metadata.mimeType).toBe(validMimeType);
      expect(metadata.lastModified).toBe(validDate);
      expect(metadata.etag).toBe('"abc123"');
      expect(Object.isFrozen(metadata)).toBe(true);
    });

    it('should create metadata without etag', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate);

      expect(metadata.etag).toBeUndefined();
    });

    it('should reject null or undefined required fields', () => {
      expect(() => new FileMetadata(null as any, validSize, validMimeType, validDate)).toThrow(
        'File path is required',
      );

      expect(() => new FileMetadata(validPath, null as any, validMimeType, validDate)).toThrow(
        'File size is required',
      );

      expect(() => new FileMetadata(validPath, validSize, null as any, validDate)).toThrow(
        'MIME type is required',
      );

      expect(() => new FileMetadata(validPath, validSize, validMimeType, null as any)).toThrow(
        'Last modified date is required',
      );
    });

    it('should reject invalid date', () => {
      expect(
        () => new FileMetadata(validPath, validSize, validMimeType, new Date('invalid')),
      ).toThrow('Invalid last modified date');

      expect(
        () => new FileMetadata(validPath, validSize, validMimeType, 'not a date' as any),
      ).toThrow('Invalid last modified date');
    });

    it('should validate etag when provided', () => {
      expect(() => new FileMetadata(validPath, validSize, validMimeType, validDate, '')).toThrow(
        'ETag must be a non-empty string',
      );

      expect(() => new FileMetadata(validPath, validSize, validMimeType, validDate, '   ')).toThrow(
        'ETag must be a non-empty string',
      );

      expect(
        () => new FileMetadata(validPath, validSize, validMimeType, validDate, 123 as any),
      ).toThrow('ETag must be a non-empty string');
    });
  });

  describe('helper methods', () => {
    it('should get file name', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate);
      expect(metadata.getFileName()).toBe('profile.json');
    });

    it('should get extension', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate);
      expect(metadata.getExtension()).toBe('.json');
    });
  });

  describe('date comparison methods', () => {
    let metadata: FileMetadata;

    beforeEach(() => {
      metadata = new FileMetadata(
        validPath,
        validSize,
        validMimeType,
        new Date('2024-01-15T12:00:00Z'),
      );
    });

    it('should check if newer than date', () => {
      expect(metadata.isNewerThan(new Date('2024-01-01'))).toBe(true);
      expect(metadata.isNewerThan(new Date('2024-01-15T11:59:59Z'))).toBe(true);
      expect(metadata.isNewerThan(new Date('2024-01-15T12:00:01Z'))).toBe(false);
      expect(metadata.isNewerThan(new Date('2024-01-20'))).toBe(false);
    });

    it('should check if older than date', () => {
      expect(metadata.isOlderThan(new Date('2024-01-20'))).toBe(true);
      expect(metadata.isOlderThan(new Date('2024-01-15T12:00:01Z'))).toBe(true);
      expect(metadata.isOlderThan(new Date('2024-01-15T11:59:59Z'))).toBe(false);
      expect(metadata.isOlderThan(new Date('2024-01-01'))).toBe(false);
    });
  });

  describe('size limit check', () => {
    it('should check if size is within limit', () => {
      const metadata = new FileMetadata(
        validPath,
        new FileSize(1024 * 1024), // 1MB
        validMimeType,
        validDate,
      );

      expect(metadata.isSizeWithinLimit(new FileSize(2 * 1024 * 1024))).toBe(true);
      expect(metadata.isSizeWithinLimit(new FileSize(1024 * 1024))).toBe(true);
      expect(metadata.isSizeWithinLimit(new FileSize(512 * 1024))).toBe(false);
    });
  });

  describe('mime type checks', () => {
    it('should check if text', () => {
      const textMetadata = new FileMetadata(
        validPath,
        validSize,
        new MimeType('text/plain'),
        validDate,
      );
      expect(textMetadata.isText()).toBe(true);

      const jsonMetadata = new FileMetadata(
        validPath,
        validSize,
        new MimeType('application/json'),
        validDate,
      );
      expect(jsonMetadata.isText()).toBe(true);

      const imageMetadata = new FileMetadata(
        validPath,
        validSize,
        new MimeType('image/jpeg'),
        validDate,
      );
      expect(imageMetadata.isText()).toBe(false);
    });

    it('should check if image', () => {
      const imageMetadata = new FileMetadata(
        validPath,
        validSize,
        new MimeType('image/png'),
        validDate,
      );
      expect(imageMetadata.isImage()).toBe(true);

      const textMetadata = new FileMetadata(
        validPath,
        validSize,
        new MimeType('text/plain'),
        validDate,
      );
      expect(textMetadata.isImage()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should compare by path and etag when etag exists', () => {
      const metadata1 = new FileMetadata(
        validPath,
        validSize,
        validMimeType,
        validDate,
        '"abc123"',
      );
      const metadata2 = new FileMetadata(
        validPath,
        new FileSize(2048), // Different size
        new MimeType('text/plain'), // Different mime
        new Date('2024-02-01'), // Different date
        '"abc123"', // Same etag
      );
      const metadata3 = new FileMetadata(
        validPath,
        validSize,
        validMimeType,
        validDate,
        '"def456"', // Different etag
      );

      expect(metadata1.equals(metadata2)).toBe(true); // Same path and etag
      expect(metadata1.equals(metadata3)).toBe(false); // Different etag
    });

    it('should compare by path, size and date when no etag', () => {
      const metadata1 = new FileMetadata(validPath, validSize, validMimeType, validDate);
      const metadata2 = new FileMetadata(
        validPath,
        validSize,
        new MimeType('text/plain'), // Different mime type
        validDate,
      );
      const metadata3 = new FileMetadata(
        validPath,
        new FileSize(2048), // Different size
        validMimeType,
        validDate,
      );
      const metadata4 = new FileMetadata(
        validPath,
        validSize,
        validMimeType,
        new Date('2024-02-01'), // Different date
      );

      expect(metadata1.equals(metadata2)).toBe(true); // Same path, size, date
      expect(metadata1.equals(metadata3)).toBe(false); // Different size
      expect(metadata1.equals(metadata4)).toBe(false); // Different date
    });

    it('should return false for different paths', () => {
      const metadata1 = new FileMetadata(
        validPath,
        validSize,
        validMimeType,
        validDate,
        '"abc123"',
      );
      const metadata2 = new FileMetadata(
        new FilePath('data/users/avatar.png'),
        validSize,
        validMimeType,
        validDate,
        '"abc123"',
      );

      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate);
      expect(metadata.toString()).toBe('profile.json (1.00 KB, application/json)');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate, '"abc123"');

      const json = metadata.toJSON();
      expect(json).toEqual({
        path: 'data/users/profile.json',
        size: 1024,
        mimeType: 'application/json',
        lastModified: '2024-01-01T00:00:00.000Z',
        etag: '"abc123"',
      });
    });

    it('should serialize without etag', () => {
      const metadata = new FileMetadata(validPath, validSize, validMimeType, validDate);

      const json = metadata.toJSON();
      expect(json.etag).toBeUndefined();
    });

    it('should deserialize from JSON', () => {
      const original = new FileMetadata(validPath, validSize, validMimeType, validDate, '"abc123"');

      const json = original.toJSON();
      const restored = FileMetadata.fromJSON(json);

      expect(restored.path.value).toBe(original.path.value);
      expect(restored.size.bytes).toBe(original.size.bytes);
      expect(restored.mimeType.value).toBe(original.mimeType.value);
      expect(restored.lastModified.getTime()).toBe(original.lastModified.getTime());
      expect(restored.etag).toBe(original.etag);
      expect(restored.equals(original)).toBe(true);
    });
  });
});
