import { describe, it, expect } from 'vitest';
import { FilePath } from '../file-path';
import { ValidationError } from '../../../errors/validation-error';

describe('FilePath', () => {
  describe('constructor', () => {
    it('should create valid file path', () => {
      const path = new FilePath('data/users/profile.json');
      expect(path.value).toBe('data/users/profile.json');
      expect(Object.isFrozen(path)).toBe(true);
    });

    it('should normalize paths', () => {
      // Windowsスタイルのパス
      expect(new FilePath('data\\users\\profile.json').value).toBe('data/users/profile.json');
      
      // 先頭のスラッシュを削除
      expect(new FilePath('/data/users/profile.json').value).toBe('data/users/profile.json');
      
      // 末尾のスラッシュを削除
      expect(new FilePath('data/users/').value).toBe('data/users');
      
      // 連続するスラッシュを正規化
      expect(new FilePath('data//users///profile.json').value).toBe('data/users/profile.json');
      
      // 空白をトリム
      expect(new FilePath('  data/users/profile.json  ').value).toBe('data/users/profile.json');
    });

    it('should reject empty paths', () => {
      expect(() => new FilePath('')).toThrow(ValidationError);
      expect(() => new FilePath('')).toThrow('File path cannot be empty');
      expect(() => new FilePath('   ')).toThrow('File path cannot be empty');
    });

    it('should reject dangerous patterns', () => {
      expect(() => new FilePath('../etc/passwd')).toThrow('File path contains dangerous patterns');
      expect(() => new FilePath('data/../../../etc/passwd')).toThrow('File path contains dangerous patterns');
      expect(() => new FilePath('data/..\\..\\windows\\system32')).toThrow('File path contains dangerous patterns');
      expect(() => new FilePath('data/..%2F..%2Fetc')).toThrow('File path contains dangerous patterns');
      expect(() => new FilePath('data/..%5C..%5Cwindows')).toThrow('File path contains dangerous patterns');
    });

    it('should reject invalid characters', () => {
      expect(() => new FilePath('data/<script>')).toThrow('File path contains invalid characters');
      expect(() => new FilePath('data/users?id=1')).toThrow('File path contains invalid characters');
      expect(() => new FilePath('data/users#section')).toThrow('File path contains invalid characters');
      expect(() => new FilePath('data/users&test')).toThrow('File path contains invalid characters');
      expect(() => new FilePath('data/users space')).toThrow('File path contains invalid characters');
    });

    it('should accept valid paths', () => {
      const validPaths = [
        'secure/319985/r5.json',
        'data/2024/01/report.pdf',
        'uploads/user_123/profile-photo.jpg',
        'files/document_v1.0.docx',
      ];

      validPaths.forEach(path => {
        expect(() => new FilePath(path)).not.toThrow();
      });
    });

    it('should reject paths that are too long', () => {
      const longPath = 'a'.repeat(256);
      expect(() => new FilePath(longPath)).toThrow('File path is too long');
    });
  });

  describe('getDirectory', () => {
    it('should return directory path', () => {
      expect(new FilePath('data/users/profile.json').getDirectory()).toBe('data/users');
      expect(new FilePath('profile.json').getDirectory()).toBe('');
      expect(new FilePath('data/profile.json').getDirectory()).toBe('data');
    });
  });

  describe('getFileName', () => {
    it('should return file name', () => {
      expect(new FilePath('data/users/profile.json').getFileName()).toBe('profile.json');
      expect(new FilePath('profile.json').getFileName()).toBe('profile.json');
      expect(new FilePath('data/users').getFileName()).toBe('users');
    });
  });

  describe('getExtension', () => {
    it('should return file extension with dot', () => {
      expect(new FilePath('profile.json').getExtension()).toBe('.json');
      expect(new FilePath('document.tar.gz').getExtension()).toBe('.gz');
      expect(new FilePath('README').getExtension()).toBe('');
      expect(new FilePath('.gitignore').getExtension()).toBe('');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should return file name without extension', () => {
      expect(new FilePath('profile.json').getFileNameWithoutExtension()).toBe('profile');
      expect(new FilePath('document.tar.gz').getFileNameWithoutExtension()).toBe('document.tar');
      expect(new FilePath('README').getFileNameWithoutExtension()).toBe('README');
      expect(new FilePath('.gitignore').getFileNameWithoutExtension()).toBe('.gitignore');
    });
  });

  describe('join', () => {
    it('should join paths correctly', () => {
      const base = new FilePath('data/users');
      const file = new FilePath('profile.json');
      const joined = file.join(base);
      expect(joined.value).toBe('data/users/profile.json');
    });
  });

  describe('equals', () => {
    it('should compare paths for equality', () => {
      const path1 = new FilePath('data/users/profile.json');
      const path2 = new FilePath('data/users/profile.json');
      const path3 = new FilePath('data/users/avatar.png');
      
      expect(path1.equals(path2)).toBe(true);
      expect(path1.equals(path3)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the path value', () => {
      const path = new FilePath('data/users/profile.json');
      expect(path.toString()).toBe('data/users/profile.json');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const path = new FilePath('data/users/profile.json');
      expect(path.toJSON()).toBe('data/users/profile.json');
      expect(JSON.stringify(path)).toBe('"data/users/profile.json"');
    });

    it('should deserialize from JSON', () => {
      const original = new FilePath('data/users/profile.json');
      const json = original.toJSON();
      const restored = FilePath.fromJSON(json);
      
      expect(restored.equals(original)).toBe(true);
      expect(restored.value).toBe(original.value);
    });
  });
});