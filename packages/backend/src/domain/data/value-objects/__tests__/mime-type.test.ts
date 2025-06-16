import { describe, it, expect } from 'vitest';
import { MimeType } from '../mime-type';
import { ValidationError } from '../../../errors/validation-error';

describe('MimeType', () => {
  describe('constructor', () => {
    it('should create valid MIME type', () => {
      const mimeType = new MimeType('application/json');
      expect(mimeType.value).toBe('application/json');
      expect(mimeType.type).toBe('application');
      expect(mimeType.subtype).toBe('json');
      expect(Object.isFrozen(mimeType)).toBe(true);
    });

    it('should normalize to lowercase', () => {
      const mimeType = new MimeType('Application/JSON');
      expect(mimeType.value).toBe('application/json');
    });

    it('should reject empty MIME type', () => {
      expect(() => new MimeType('')).toThrow(ValidationError);
      expect(() => new MimeType('')).toThrow('MIME type cannot be empty');
      expect(() => new MimeType('   ')).toThrow('MIME type cannot be empty');
    });

    it('should reject invalid format', () => {
      expect(() => new MimeType('invalid')).toThrow('MIME type must have type and subtype');
      expect(() => new MimeType('application')).toThrow('MIME type must have type and subtype');
      expect(() => new MimeType('/json')).toThrow('MIME type must have type and subtype');
      expect(() => new MimeType('application/')).toThrow('MIME type must have type and subtype');
    });

    it('should accept valid MIME types', () => {
      const validTypes = [
        'text/plain',
        'text/html',
        'application/json',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      validTypes.forEach((type) => {
        expect(() => new MimeType(type)).not.toThrow();
      });
    });
  });

  describe('static constants', () => {
    it('should provide common MIME types', () => {
      expect(MimeType.APPLICATION_JSON.value).toBe('application/json');
      expect(MimeType.APPLICATION_PDF.value).toBe('application/pdf');
      expect(MimeType.TEXT_PLAIN.value).toBe('text/plain');
      expect(MimeType.IMAGE_JPEG.value).toBe('image/jpeg');
      expect(MimeType.APPLICATION_OCTET_STREAM.value).toBe('application/octet-stream');
    });
  });

  describe('fromExtension', () => {
    it('should return correct MIME type for known extensions', () => {
      expect(MimeType.fromExtension('.json').value).toBe('application/json');
      expect(MimeType.fromExtension('json').value).toBe('application/json');
      expect(MimeType.fromExtension('.PDF').value).toBe('application/pdf');
      expect(MimeType.fromExtension('.txt').value).toBe('text/plain');
      expect(MimeType.fromExtension('.jpg').value).toBe('image/jpeg');
      expect(MimeType.fromExtension('.jpeg').value).toBe('image/jpeg');
      expect(MimeType.fromExtension('.xls').value).toBe('application/vnd.ms-excel');
    });

    it('should return application/octet-stream for unknown extensions', () => {
      expect(MimeType.fromExtension('.xyz').value).toBe('application/octet-stream');
      expect(MimeType.fromExtension('.unknown').value).toBe('application/octet-stream');
    });
  });

  describe('fromFilePath', () => {
    it('should extract MIME type from file path', () => {
      expect(MimeType.fromFilePath('/data/users/profile.json').value).toBe('application/json');
      expect(MimeType.fromFilePath('document.pdf').value).toBe('application/pdf');
      expect(MimeType.fromFilePath('image.jpeg').value).toBe('image/jpeg');
      expect(MimeType.fromFilePath('/path/to/file.txt').value).toBe('text/plain');
    });

    it('should return application/octet-stream for files without extension', () => {
      expect(MimeType.fromFilePath('README').value).toBe('application/octet-stream');
      expect(MimeType.fromFilePath('/path/to/file').value).toBe('application/octet-stream');
      expect(MimeType.fromFilePath('file.').value).toBe('application/octet-stream');
    });
  });

  describe('type checking methods', () => {
    it('should identify text types', () => {
      expect(new MimeType('text/plain').isText()).toBe(true);
      expect(new MimeType('text/html').isText()).toBe(true);
      expect(new MimeType('text/csv').isText()).toBe(true);
      expect(new MimeType('application/json').isText()).toBe(true);
      expect(new MimeType('application/xml').isText()).toBe(true);
      expect(new MimeType('image/jpeg').isText()).toBe(false);
      expect(new MimeType('application/pdf').isText()).toBe(false);
    });

    it('should identify image types', () => {
      expect(new MimeType('image/jpeg').isImage()).toBe(true);
      expect(new MimeType('image/png').isImage()).toBe(true);
      expect(new MimeType('image/gif').isImage()).toBe(true);
      expect(new MimeType('text/plain').isImage()).toBe(false);
      expect(new MimeType('application/pdf').isImage()).toBe(false);
    });

    it('should identify JSON types', () => {
      expect(new MimeType('application/json').isJson()).toBe(true);
      expect(new MimeType('application/ld+json').isJson()).toBe(true);
      expect(new MimeType('application/vnd.api+json').isJson()).toBe(true);
      expect(new MimeType('text/plain').isJson()).toBe(false);
      expect(new MimeType('application/xml').isJson()).toBe(false);
    });

    it('should identify binary types', () => {
      expect(new MimeType('application/pdf').isBinary()).toBe(true);
      expect(new MimeType('image/jpeg').isBinary()).toBe(true);
      expect(new MimeType('application/octet-stream').isBinary()).toBe(true);
      expect(new MimeType('text/plain').isBinary()).toBe(false);
      expect(new MimeType('application/json').isBinary()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should compare MIME types for equality', () => {
      const type1 = new MimeType('application/json');
      const type2 = new MimeType('application/json');
      const type3 = new MimeType('text/plain');

      expect(type1.equals(type2)).toBe(true);
      expect(type1.equals(type3)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const mimeType = new MimeType('application/json');
      expect(mimeType.toString()).toBe('application/json');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const mimeType = new MimeType('application/json');
      expect(mimeType.toJSON()).toBe('application/json');
      expect(JSON.stringify(mimeType)).toBe('"application/json"');
    });

    it('should deserialize from JSON', () => {
      const original = new MimeType('application/pdf');
      const json = original.toJSON();
      const restored = MimeType.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
      expect(restored.value).toBe(original.value);
    });
  });
});
