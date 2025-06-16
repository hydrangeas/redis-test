import { describe, it, expect } from 'vitest';
import { FileSize } from '../file-size';
import { ValidationError } from '../../../errors/validation-error';

describe('FileSize', () => {
  describe('constructor', () => {
    it('should create valid file size', () => {
      const size = new FileSize(1024);
      expect(size.bytes).toBe(1024);
      expect(Object.isFrozen(size)).toBe(true);
    });

    it('should reject non-integer values', () => {
      expect(() => new FileSize(10.5)).toThrow(ValidationError);
      expect(() => new FileSize(10.5)).toThrow('File size must be an integer');
      expect(() => new FileSize(NaN)).toThrow('File size must be an integer');
    });

    it('should reject negative values', () => {
      expect(() => new FileSize(-1)).toThrow(ValidationError);
      expect(() => new FileSize(-1)).toThrow('File size cannot be negative');
      expect(() => new FileSize(-1000)).toThrow('File size cannot be negative');
    });

    it('should reject values exceeding maximum size', () => {
      const maxSize = 10 * FileSize.GIGABYTE;
      expect(() => new FileSize(maxSize + 1)).toThrow(ValidationError);
      expect(() => new FileSize(maxSize + 1)).toThrow('File size exceeds maximum allowed size');
    });

    it('should accept zero', () => {
      const size = new FileSize(0);
      expect(size.bytes).toBe(0);
    });

    it('should accept maximum allowed size', () => {
      const maxSize = 10 * FileSize.GIGABYTE;
      const size = new FileSize(maxSize);
      expect(size.bytes).toBe(maxSize);
    });
  });

  describe('static constants', () => {
    it('should have correct size constants', () => {
      expect(FileSize.BYTE).toBe(1);
      expect(FileSize.KILOBYTE).toBe(1024);
      expect(FileSize.MEGABYTE).toBe(1024 * 1024);
      expect(FileSize.GIGABYTE).toBe(1024 * 1024 * 1024);
    });
  });

  describe('unit conversions', () => {
    it('should convert to kilobytes', () => {
      expect(new FileSize(1024).toKiloBytes()).toBe(1);
      expect(new FileSize(2048).toKiloBytes()).toBe(2);
      expect(new FileSize(512).toKiloBytes()).toBe(0.5);
    });

    it('should convert to megabytes', () => {
      expect(new FileSize(1024 * 1024).toMegaBytes()).toBe(1);
      expect(new FileSize(2 * 1024 * 1024).toMegaBytes()).toBe(2);
      expect(new FileSize(512 * 1024).toMegaBytes()).toBe(0.5);
    });

    it('should convert to gigabytes', () => {
      expect(new FileSize(1024 * 1024 * 1024).toGigaBytes()).toBe(1);
      expect(new FileSize(2 * 1024 * 1024 * 1024).toGigaBytes()).toBe(2);
      expect(new FileSize(512 * 1024 * 1024).toGigaBytes()).toBe(0.5);
    });
  });

  describe('toHumanReadable', () => {
    it('should format bytes', () => {
      expect(new FileSize(0).toHumanReadable()).toBe('0 B');
      expect(new FileSize(1).toHumanReadable()).toBe('1 B');
      expect(new FileSize(999).toHumanReadable()).toBe('999 B');
      expect(new FileSize(1023).toHumanReadable()).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(new FileSize(1024).toHumanReadable()).toBe('1.00 KB');
      expect(new FileSize(1536).toHumanReadable()).toBe('1.50 KB');
      expect(new FileSize(1024 * 999).toHumanReadable()).toBe('999.00 KB');
    });

    it('should format megabytes', () => {
      expect(new FileSize(1024 * 1024).toHumanReadable()).toBe('1.00 MB');
      expect(new FileSize(1.5 * 1024 * 1024).toHumanReadable()).toBe('1.50 MB');
      expect(new FileSize(999 * 1024 * 1024).toHumanReadable()).toBe('999.00 MB');
    });

    it('should format gigabytes', () => {
      expect(new FileSize(1024 * 1024 * 1024).toHumanReadable()).toBe('1.00 GB');
      expect(new FileSize(1.5 * 1024 * 1024 * 1024).toHumanReadable()).toBe('1.50 GB');
      expect(new FileSize(10 * 1024 * 1024 * 1024).toHumanReadable()).toBe('10.00 GB');
    });
  });

  describe('comparison methods', () => {
    const size1MB = new FileSize(1024 * 1024);
    const size2MB = new FileSize(2 * 1024 * 1024);
    const size1MBDupe = new FileSize(1024 * 1024);

    it('should check if greater than', () => {
      expect(size2MB.isGreaterThan(size1MB)).toBe(true);
      expect(size1MB.isGreaterThan(size2MB)).toBe(false);
      expect(size1MB.isGreaterThan(size1MBDupe)).toBe(false);
    });

    it('should check if less than', () => {
      expect(size1MB.isLessThan(size2MB)).toBe(true);
      expect(size2MB.isLessThan(size1MB)).toBe(false);
      expect(size1MB.isLessThan(size1MBDupe)).toBe(false);
    });

    it('should check if less than or equal to', () => {
      expect(size1MB.isLessThanOrEqualTo(size2MB)).toBe(true);
      expect(size2MB.isLessThanOrEqualTo(size1MB)).toBe(false);
      expect(size1MB.isLessThanOrEqualTo(size1MBDupe)).toBe(true);
    });
  });

  describe('equals', () => {
    it('should compare file sizes for equality', () => {
      const size1 = new FileSize(1024);
      const size2 = new FileSize(1024);
      const size3 = new FileSize(2048);

      expect(size1.equals(size2)).toBe(true);
      expect(size1.equals(size3)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return human readable string', () => {
      expect(new FileSize(1024).toString()).toBe('1.00 KB');
      expect(new FileSize(1024 * 1024).toString()).toBe('1.00 MB');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const size = new FileSize(1024);
      expect(size.toJSON()).toBe(1024);
      expect(JSON.stringify(size)).toBe('1024');
    });

    it('should deserialize from JSON', () => {
      const original = new FileSize(2048);
      const json = original.toJSON();
      const restored = FileSize.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
      expect(restored.bytes).toBe(original.bytes);
    });
  });

  describe('factory methods', () => {
    it('should create from kilobytes', () => {
      const size = FileSize.kiloBytes(10);
      expect(size.bytes).toBe(10 * 1024);
      expect(size.toKiloBytes()).toBe(10);
    });

    it('should create from megabytes', () => {
      const size = FileSize.megaBytes(5);
      expect(size.bytes).toBe(5 * 1024 * 1024);
      expect(size.toMegaBytes()).toBe(5);
    });

    it('should create from gigabytes', () => {
      const size = FileSize.gigaBytes(2);
      expect(size.bytes).toBe(2 * 1024 * 1024 * 1024);
      expect(size.toGigaBytes()).toBe(2);
    });

    it('should validate through factory methods', () => {
      expect(() => FileSize.megaBytes(-1)).toThrow('File size cannot be negative');
      expect(() => FileSize.gigaBytes(11)).toThrow('File size exceeds maximum allowed size');
    });
  });
});
