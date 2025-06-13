import { describe, it, expect } from 'vitest';
import { ContentType } from '../content-type';
import { ValidationError } from '../../../errors/validation-error';

describe('ContentType', () => {
  describe('constructor', () => {
    it('should create valid content type', () => {
      const ct = new ContentType('application/json');
      expect(ct.value).toBe('application/json');
      expect(ct.type).toBe('application');
      expect(ct.subtype).toBe('json');
      expect(Object.isFrozen(ct)).toBe(true);
    });

    it('should normalize to lowercase', () => {
      const ct = new ContentType('Application/JSON');
      expect(ct.value).toBe('application/json');
      expect(ct.type).toBe('application');
      expect(ct.subtype).toBe('json');
    });

    it('should parse content type with parameters', () => {
      const ct = new ContentType('text/html; charset=utf-8');
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('html');
      expect(ct.getParameter('charset')).toBe('utf-8');
    });

    it('should handle multiple parameters', () => {
      const ct = new ContentType('multipart/form-data; boundary=----WebKitFormBoundary; charset=utf-8');
      expect(ct.type).toBe('multipart');
      expect(ct.subtype).toBe('form-data');
      expect(ct.getParameter('boundary')).toBe('----webkitformboundary'); // lowercase
      expect(ct.getParameter('charset')).toBe('utf-8');
    });

    it('should trim whitespace', () => {
      const ct = new ContentType('  application/json  ;  charset=utf-8  ');
      expect(ct.value).toBe('application/json; charset=utf-8');
      expect(ct.getParameter('charset')).toBe('utf-8');
    });

    it('should reject empty content type', () => {
      expect(() => new ContentType('')).toThrow(ValidationError);
      expect(() => new ContentType('')).toThrow('Content type cannot be empty');
      expect(() => new ContentType('   ')).toThrow('Content type cannot be empty');
    });

    it('should reject invalid format', () => {
      expect(() => new ContentType('invalid')).toThrow('Invalid content type format');
      expect(() => new ContentType('application')).toThrow('Invalid content type format');
      expect(() => new ContentType('/json')).toThrow('Content type must have type and subtype');
      expect(() => new ContentType('application/')).toThrow('Content type must have type and subtype');
      expect(() => new ContentType('application/<script>')).toThrow('Invalid content type format');
    });

    it('should accept valid MIME types', () => {
      // Standard types
      expect(() => new ContentType('text/plain')).not.toThrow();
      expect(() => new ContentType('image/png')).not.toThrow();
      expect(() => new ContentType('video/mp4')).not.toThrow();
      
      // With + notation
      expect(() => new ContentType('application/problem+json')).not.toThrow();
      expect(() => new ContentType('application/vnd.api+json')).not.toThrow();
      
      // With dots and dashes
      expect(() => new ContentType('application/vnd.ms-excel')).not.toThrow();
      expect(() => new ContentType('application/x-www-form-urlencoded')).not.toThrow();
    });
  });

  describe('static constants', () => {
    it('should provide common content types', () => {
      expect(ContentType.APPLICATION_JSON.value).toBe('application/json');
      expect(ContentType.APPLICATION_PROBLEM_JSON.value).toBe('application/problem+json');
      expect(ContentType.TEXT_PLAIN.value).toBe('text/plain');
      expect(ContentType.TEXT_HTML.value).toBe('text/html');
      expect(ContentType.APPLICATION_OCTET_STREAM.value).toBe('application/octet-stream');
    });
  });

  describe('getParameter', () => {
    it('should get parameters case-insensitively', () => {
      const ct = new ContentType('text/html; Charset=UTF-8');
      expect(ct.getParameter('charset')).toBe('utf-8');
      expect(ct.getParameter('CHARSET')).toBe('utf-8');
      expect(ct.getParameter('Charset')).toBe('utf-8');
    });

    it('should return undefined for missing parameters', () => {
      const ct = new ContentType('application/json');
      expect(ct.getParameter('charset')).toBeUndefined();
      expect(ct.getParameter('boundary')).toBeUndefined();
    });
  });

  describe('getCharset', () => {
    it('should get charset parameter', () => {
      const ct1 = new ContentType('text/html; charset=utf-8');
      expect(ct1.getCharset()).toBe('utf-8');

      const ct2 = new ContentType('application/json');
      expect(ct2.getCharset()).toBeUndefined();
    });
  });

  describe('isJson', () => {
    it('should identify JSON types', () => {
      expect(new ContentType('application/json').isJson()).toBe(true);
      expect(new ContentType('application/problem+json').isJson()).toBe(true);
      expect(new ContentType('application/vnd.api+json').isJson()).toBe(true);
      expect(new ContentType('application/ld+json').isJson()).toBe(true);
    });

    it('should not identify non-JSON types', () => {
      expect(new ContentType('text/plain').isJson()).toBe(false);
      expect(new ContentType('text/html').isJson()).toBe(false);
      expect(new ContentType('application/xml').isJson()).toBe(false);
      expect(new ContentType('application/octet-stream').isJson()).toBe(false);
    });
  });

  describe('isText', () => {
    it('should identify text types', () => {
      expect(new ContentType('text/plain').isText()).toBe(true);
      expect(new ContentType('text/html').isText()).toBe(true);
      expect(new ContentType('text/css').isText()).toBe(true);
      expect(new ContentType('text/javascript').isText()).toBe(true);
    });

    it('should identify JSON as text', () => {
      expect(new ContentType('application/json').isText()).toBe(true);
      expect(new ContentType('application/problem+json').isText()).toBe(true);
    });

    it('should not identify binary types as text', () => {
      expect(new ContentType('image/png').isText()).toBe(false);
      expect(new ContentType('video/mp4').isText()).toBe(false);
      expect(new ContentType('application/octet-stream').isText()).toBe(false);
      expect(new ContentType('application/pdf').isText()).toBe(false);
    });
  });

  describe('isBinary', () => {
    it('should identify binary types', () => {
      expect(new ContentType('image/png').isBinary()).toBe(true);
      expect(new ContentType('video/mp4').isBinary()).toBe(true);
      expect(new ContentType('application/octet-stream').isBinary()).toBe(true);
      expect(new ContentType('application/pdf').isBinary()).toBe(true);
    });

    it('should not identify text types as binary', () => {
      expect(new ContentType('text/plain').isBinary()).toBe(false);
      expect(new ContentType('application/json').isBinary()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should compare content types ignoring parameters', () => {
      const ct1 = new ContentType('application/json');
      const ct2 = new ContentType('application/json; charset=utf-8');
      const ct3 = new ContentType('text/plain');

      expect(ct1.equals(ct2)).toBe(true);
      expect(ct1.equals(ct3)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const ct1 = new ContentType('Application/JSON');
      const ct2 = new ContentType('application/json');
      expect(ct1.equals(ct2)).toBe(true);
    });
  });

  describe('equalsWithParameters', () => {
    it('should compare content types including parameters', () => {
      const ct1 = new ContentType('application/json; charset=utf-8');
      const ct2 = new ContentType('application/json; charset=utf-8');
      const ct3 = new ContentType('application/json');
      const ct4 = new ContentType('application/json; charset=iso-8859-1');

      expect(ct1.equalsWithParameters(ct2)).toBe(true);
      expect(ct1.equalsWithParameters(ct3)).toBe(false);
      expect(ct1.equalsWithParameters(ct4)).toBe(false);
    });

    it('should handle parameter order', () => {
      const ct1 = new ContentType('multipart/form-data; boundary=abc; charset=utf-8');
      const ct2 = new ContentType('multipart/form-data; charset=utf-8; boundary=abc');
      expect(ct1.equalsWithParameters(ct2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      expect(new ContentType('application/json').toString()).toBe('application/json');
      expect(new ContentType('text/html; charset=utf-8').toString()).toBe('text/html; charset=utf-8');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const ct = new ContentType('application/json; charset=utf-8');
      expect(ct.toJSON()).toBe('application/json; charset=utf-8');
      expect(JSON.stringify(ct)).toBe('"application/json; charset=utf-8"');
    });

    it('should deserialize from JSON', () => {
      const original = new ContentType('text/html; charset=utf-8');
      const json = original.toJSON();
      const restored = ContentType.fromJSON(json);
      
      expect(restored.equalsWithParameters(original)).toBe(true);
      expect(restored.value).toBe(original.value);
    });
  });
});