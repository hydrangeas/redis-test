import { describe, it, expect } from 'vitest';
import { PathValidator } from '../path-validator';
import { PathTraversalException } from '../../errors/exceptions';

describe('PathValidator', () => {
  describe('validateAndSanitize', () => {
    it('should accept valid paths', () => {
      const validPaths = [
        'data/test.json',
        'secure/319985/r5.json',
        'files/document.txt',
        'folder/subfolder/file.json',
      ];

      for (const validPath of validPaths) {
        expect(() => PathValidator.validateAndSanitize(validPath)).not.toThrow();
      }
    });

    it('should reject directory traversal attempts', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'data/../../../etc/passwd',
        'test/../../secret.json',
        'normal/../../../etc/passwd',
      ];

      for (const dangerousPath of dangerousPaths) {
        expect(() => PathValidator.validateAndSanitize(dangerousPath))
          .toThrow(PathTraversalException);
      }
    });

    it('should reject absolute paths', () => {
      const absolutePaths = [
        '/etc/passwd',
        '/root/.ssh/id_rsa',
        '//server/share/file',
        '/var/log/syslog',
      ];

      for (const absolutePath of absolutePaths) {
        expect(() => PathValidator.validateAndSanitize(absolutePath))
          .toThrow(PathTraversalException);
      }
    });

    it('should reject home directory references', () => {
      const homePaths = [
        '~/Documents/secret.txt',
        '~/.ssh/id_rsa',
        '~/../../etc/passwd',
      ];

      for (const homePath of homePaths) {
        expect(() => PathValidator.validateAndSanitize(homePath))
          .toThrow(PathTraversalException);
      }
    });

    it('should reject null bytes and control characters', () => {
      const maliciousPaths = [
        'file.txt\0.jpg',
        'test\x00.json',
        'data\x01\x02\x03.txt',
        'file\nname.json',
      ];

      for (const maliciousPath of maliciousPaths) {
        expect(() => PathValidator.validateAndSanitize(maliciousPath))
          .toThrow(PathTraversalException);
      }
    });

    it('should reject Windows reserved names', () => {
      const reservedNames = [
        'con',
        'prn',
        'aux',
        'nul',
        'com1',
        'lpt1',
        'con.txt',
        'prn.json',
      ];

      for (const reservedName of reservedNames) {
        expect(() => PathValidator.validateAndSanitize(reservedName))
          .toThrow(PathTraversalException);
      }
    });

    it('should reject hidden files and directories', () => {
      const hiddenPaths = [
        '.hidden',
        '.git/config',
        'folder/.secret',
        '.env',
        '.ssh/id_rsa',
      ];

      for (const hiddenPath of hiddenPaths) {
        expect(() => PathValidator.validateAndSanitize(hiddenPath))
          .toThrow(PathTraversalException);
      }
    });

    it('should validate paths within base directory', () => {
      const basePath = '/app/data';
      
      // Valid paths within base
      expect(() => PathValidator.validateAndSanitize('test.json', basePath)).not.toThrow();
      expect(() => PathValidator.validateAndSanitize('folder/file.json', basePath)).not.toThrow();
      
      // Invalid paths trying to escape base
      expect(() => PathValidator.validateAndSanitize('../secret.json', basePath))
        .toThrow(PathTraversalException);
    });

    it('should handle empty or invalid input', () => {
      expect(() => PathValidator.validateAndSanitize('')).toThrow(PathTraversalException);
      expect(() => PathValidator.validateAndSanitize(null as any)).toThrow(PathTraversalException);
      expect(() => PathValidator.validateAndSanitize(undefined as any)).toThrow(PathTraversalException);
      expect(() => PathValidator.validateAndSanitize(123 as any)).toThrow(PathTraversalException);
    });
  });

  describe('isAllowedExtension', () => {
    it('should check file extensions correctly', () => {
      const allowedExtensions = ['.json', '.txt', '.xml'];
      
      expect(PathValidator.isAllowedExtension('file.json', allowedExtensions)).toBe(true);
      expect(PathValidator.isAllowedExtension('file.txt', allowedExtensions)).toBe(true);
      expect(PathValidator.isAllowedExtension('file.xml', allowedExtensions)).toBe(true);
      expect(PathValidator.isAllowedExtension('file.pdf', allowedExtensions)).toBe(false);
      expect(PathValidator.isAllowedExtension('file.exe', allowedExtensions)).toBe(false);
      
      // Case insensitive
      expect(PathValidator.isAllowedExtension('file.JSON', allowedExtensions)).toBe(true);
      expect(PathValidator.isAllowedExtension('file.TXT', allowedExtensions)).toBe(true);
    });
  });

  describe('isValidJsonPath', () => {
    it('should validate JSON file paths', () => {
      expect(PathValidator.isValidJsonPath('data.json')).toBe(true);
      expect(PathValidator.isValidJsonPath('folder/file.json')).toBe(true);
      expect(PathValidator.isValidJsonPath('test.JSON')).toBe(true);
      
      expect(PathValidator.isValidJsonPath('data.txt')).toBe(false);
      expect(PathValidator.isValidJsonPath('file.xml')).toBe(false);
      expect(PathValidator.isValidJsonPath('noextension')).toBe(false);
    });
  });
});