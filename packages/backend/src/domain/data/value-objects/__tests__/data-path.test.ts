import { describe, it, expect } from 'vitest';
import { DataPath } from '../data-path';

describe('DataPath', () => {
  describe('create', () => {
    it('should create valid DataPath for proper JSON paths', () => {
      const validPaths = [
        'secure/319985/r5.json',
        'public/dataset.json',
        'archive/2024/data.json',
        'data.json',
        'deep/nested/folder/structure/file.json',
      ];

      validPaths.forEach((path) => {
        const result = DataPath.create(path);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(path);
      });
    });

    it('should fail for empty or whitespace paths', () => {
      const invalidPaths = ['', '   ', '\t', '\n'];

      invalidPaths.forEach((path) => {
        const result = DataPath.create(path);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_PATH');
      });
    });

    it('should fail for paths not ending with .json', () => {
      const invalidPaths = [
        'secure/319985/r5.xml',
        'public/dataset.csv',
        'archive/2024/data',
        'data.txt',
        'file.JSON', // case sensitive
      ];

      invalidPaths.forEach((path) => {
        const result = DataPath.create(path);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_PATH_FORMAT');
      });
    });

    it('should fail for paths exceeding maximum length', () => {
      const longPath = 'a'.repeat(1020) + '.json';
      const result = DataPath.create(longPath);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('PATH_TOO_LONG');
    });

    it('should prevent path traversal attacks', () => {
      const dangerousPaths = [
        '../etc/passwd.json',
        '../../secret.json',
        './hidden/file.json',
        'data/../../../etc/passwd.json',
        'secure/./../../admin.json',
      ];

      dangerousPaths.forEach((path) => {
        const result = DataPath.create(path);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_PATH');
        expect(result.getError().type).toBe('SECURITY');
      });
    });

    it('should fail for paths with dangerous characters', () => {
      const dangerousPaths = [
        'data<script>.json',
        'file>redirect.json',
        'pipe|command.json',
        'question?mark.json',
        'asterisk*.json',
        'null\x00byte.json',
        'control\x1fchar.json',
      ];

      dangerousPaths.forEach((path) => {
        const result = DataPath.create(path);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_PATH_CHARACTERS');
      });
    });

    it('should fail for segments exceeding maximum length', () => {
      const longSegment = 'a'.repeat(256);
      const path = `folder/${longSegment}.json`;
      const result = DataPath.create(path);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('PATH_SEGMENT_TOO_LONG');
    });

    it('should properly parse segments', () => {
      const result = DataPath.create('secure/319985/r5.json');
      expect(result.isSuccess).toBe(true);

      const dataPath = result.getValue();
      expect(dataPath.segments).toEqual(['secure', '319985', 'r5.json']);
    });
  });

  describe('toFileSystemPath', () => {
    it('should convert to filesystem path correctly', () => {
      const result = DataPath.create('secure/319985/r5.json');
      const dataPath = result.getValue();

      const fsPath = dataPath.toFileSystemPath('/data');
      // Path separator might vary by OS
      expect(fsPath).toMatch(/^\/data[/\\]secure[/\\]319985[/\\]r5\.json$/);
    });

    it('should handle root directory', () => {
      const result = DataPath.create('file.json');
      const dataPath = result.getValue();

      const fsPath = dataPath.toFileSystemPath('/data');
      expect(fsPath).toMatch(/^\/data[/\\]file\.json$/);
    });
  });

  describe('directory getter', () => {
    it('should extract directory path', () => {
      const result = DataPath.create('secure/319985/r5.json');
      const dataPath = result.getValue();

      expect(dataPath.directory).toBe('/secure/319985');
    });

    it('should return root for top-level files', () => {
      const result = DataPath.create('file.json');
      const dataPath = result.getValue();

      expect(dataPath.directory).toBe('/');
    });
  });

  describe('filename getter', () => {
    it('should extract filename', () => {
      const result = DataPath.create('secure/319985/r5.json');
      const dataPath = result.getValue();

      expect(dataPath.filename).toBe('r5.json');
    });

    it('should handle root files', () => {
      const result = DataPath.create('data.json');
      const dataPath = result.getValue();

      expect(dataPath.filename).toBe('data.json');
    });
  });

  describe('extension getter', () => {
    it('should extract file extension', () => {
      const result = DataPath.create('secure/data.json');
      const dataPath = result.getValue();

      expect(dataPath.extension).toBe('.json');
    });

    it('should handle multiple dots in filename', () => {
      const result = DataPath.create('data.backup.json');
      const dataPath = result.getValue();

      expect(dataPath.extension).toBe('.json');
    });
  });

  describe('depth getter', () => {
    it('should calculate path depth', () => {
      const paths = [
        { path: 'file.json', depth: 1 },
        { path: 'folder/file.json', depth: 2 },
        { path: 'a/b/c/d/file.json', depth: 5 },
      ];

      paths.forEach(({ path, depth }) => {
        const result = DataPath.create(path);
        expect(result.getValue().depth).toBe(depth);
      });
    });
  });

  describe('isUnder', () => {
    it('should check if path is under parent', () => {
      const result = DataPath.create('secure/319985/r5.json');
      const dataPath = result.getValue();

      expect(dataPath.isUnder('secure')).toBe(true);
      expect(dataPath.isUnder('secure/319985')).toBe(true);
      expect(dataPath.isUnder('public')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal paths', () => {
      const path1 = DataPath.create('secure/data.json').getValue();
      const path2 = DataPath.create('secure/data.json').getValue();

      expect(path1.equals(path2)).toBe(true);
    });

    it('should return false for different paths', () => {
      const path1 = DataPath.create('secure/data1.json').getValue();
      const path2 = DataPath.create('secure/data2.json').getValue();

      expect(path1.equals(path2)).toBe(false);
    });

    it('should handle null comparison', () => {
      const path = DataPath.create('data.json').getValue();
      expect(path.equals(null as any)).toBe(false);
    });
  });

  describe('toString and toJSON', () => {
    it('should return string representation', () => {
      const path = DataPath.create('secure/data.json').getValue();
      expect(path.toString()).toBe('secure/data.json');
    });

    it('should serialize to JSON correctly', () => {
      const path = DataPath.create('secure/data.json').getValue();
      const json = JSON.stringify({ path });
      const parsed = JSON.parse(json);

      expect(parsed.path).toBe('secure/data.json');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const path = DataPath.create('secure/data.json').getValue();
      const value = path.value;
      const segments = [...path.segments];

      // Try to modify (should not work due to Object.freeze)
      expect(() => {
        (path as any).value = 'modified';
      }).toThrow();

      expect(() => {
        path.segments.push('extra');
      }).toThrow();

      expect(path.value).toBe(value);
      expect(path.segments).toEqual(segments);
    });
  });
});
