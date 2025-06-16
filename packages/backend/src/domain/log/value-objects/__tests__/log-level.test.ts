import { describe, it, expect } from 'vitest';
import { LogLevel } from '../log-level';

describe('LogLevel', () => {
  describe('事前定義されたログレベル', () => {
    it('DEBUG、INFO、WARN、ERRORレベルが定義されている', () => {
      expect(LogLevel.DEBUG).toBeDefined();
      expect(LogLevel.INFO).toBeDefined();
      expect(LogLevel.WARN).toBeDefined();
      expect(LogLevel.ERROR).toBeDefined();
    });

    it('各レベルが正しい名前と値を持つ', () => {
      expect(LogLevel.DEBUG.level).toBe('DEBUG');
      expect(LogLevel.DEBUG.value).toBe(10);

      expect(LogLevel.INFO.level).toBe('INFO');
      expect(LogLevel.INFO.value).toBe(20);

      expect(LogLevel.WARN.level).toBe('WARN');
      expect(LogLevel.WARN.value).toBe(30);

      expect(LogLevel.ERROR.level).toBe('ERROR');
      expect(LogLevel.ERROR.value).toBe(40);
    });
  });

  describe('fromString', () => {
    it('有効な文字列からログレベルを作成する', () => {
      const testCases = [
        { input: 'DEBUG', expected: LogLevel.DEBUG },
        { input: 'INFO', expected: LogLevel.INFO },
        { input: 'WARN', expected: LogLevel.WARN },
        { input: 'ERROR', expected: LogLevel.ERROR },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = LogLevel.fromString(input);
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(expected);
      });
    });

    it('大文字小文字を区別しない', () => {
      const testCases = [
        { input: 'debug', expected: LogLevel.DEBUG },
        { input: 'Info', expected: LogLevel.INFO },
        { input: 'wArN', expected: LogLevel.WARN },
        { input: 'error', expected: LogLevel.ERROR },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = LogLevel.fromString(input);
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(expected);
      });
    });

    it('無効な文字列の場合はエラーを返す', () => {
      const invalidInputs = ['INVALID', 'TRACE', 'FATAL', '', '123'];

      invalidInputs.forEach((input) => {
        const result = LogLevel.fromString(input);
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(`無効なログレベル: ${input}`);
      });
    });
  });

  describe('レベル比較', () => {
    describe('isLowerThan', () => {
      it('ログレベルを正しく比較する', () => {
        expect(LogLevel.DEBUG.isLowerThan(LogLevel.INFO)).toBe(true);
        expect(LogLevel.INFO.isLowerThan(LogLevel.WARN)).toBe(true);
        expect(LogLevel.WARN.isLowerThan(LogLevel.ERROR)).toBe(true);

        expect(LogLevel.ERROR.isLowerThan(LogLevel.WARN)).toBe(false);
        expect(LogLevel.WARN.isLowerThan(LogLevel.INFO)).toBe(false);
        expect(LogLevel.INFO.isLowerThan(LogLevel.DEBUG)).toBe(false);

        expect(LogLevel.INFO.isLowerThan(LogLevel.INFO)).toBe(false);
      });
    });

    describe('isHigherThan', () => {
      it('ログレベルを正しく比較する', () => {
        expect(LogLevel.ERROR.isHigherThan(LogLevel.WARN)).toBe(true);
        expect(LogLevel.WARN.isHigherThan(LogLevel.INFO)).toBe(true);
        expect(LogLevel.INFO.isHigherThan(LogLevel.DEBUG)).toBe(true);

        expect(LogLevel.DEBUG.isHigherThan(LogLevel.INFO)).toBe(false);
        expect(LogLevel.INFO.isHigherThan(LogLevel.WARN)).toBe(false);
        expect(LogLevel.WARN.isHigherThan(LogLevel.ERROR)).toBe(false);

        expect(LogLevel.INFO.isHigherThan(LogLevel.INFO)).toBe(false);
      });
    });

    describe('meetsMinimumLevel', () => {
      it('最小レベルを満たすかどうかを判定する', () => {
        const minLevel = LogLevel.WARN;

        expect(LogLevel.DEBUG.meetsMinimumLevel(minLevel)).toBe(false);
        expect(LogLevel.INFO.meetsMinimumLevel(minLevel)).toBe(false);
        expect(LogLevel.WARN.meetsMinimumLevel(minLevel)).toBe(true);
        expect(LogLevel.ERROR.meetsMinimumLevel(minLevel)).toBe(true);
      });
    });
  });

  describe('equals', () => {
    it('同じログレベルは等しいと判定される', () => {
      expect(LogLevel.DEBUG.equals(LogLevel.DEBUG)).toBe(true);
      expect(LogLevel.INFO.equals(LogLevel.INFO)).toBe(true);
      expect(LogLevel.WARN.equals(LogLevel.WARN)).toBe(true);
      expect(LogLevel.ERROR.equals(LogLevel.ERROR)).toBe(true);
    });

    it('異なるログレベルは等しくないと判定される', () => {
      expect(LogLevel.DEBUG.equals(LogLevel.INFO)).toBe(false);
      expect(LogLevel.INFO.equals(LogLevel.WARN)).toBe(false);
      expect(LogLevel.WARN.equals(LogLevel.ERROR)).toBe(false);
    });

    it('nullまたはundefinedとの比較はfalseを返す', () => {
      expect(LogLevel.INFO.equals(null as any)).toBe(false);
      expect(LogLevel.INFO.equals(undefined as any)).toBe(false);
    });
  });

  describe('シリアライゼーション', () => {
    it('toString()でレベル名を返す', () => {
      expect(LogLevel.DEBUG.toString()).toBe('DEBUG');
      expect(LogLevel.INFO.toString()).toBe('INFO');
      expect(LogLevel.WARN.toString()).toBe('WARN');
      expect(LogLevel.ERROR.toString()).toBe('ERROR');
    });

    it('toJSON()でレベル名を返す', () => {
      expect(LogLevel.DEBUG.toJSON()).toBe('DEBUG');
      expect(LogLevel.INFO.toJSON()).toBe('INFO');
      expect(LogLevel.WARN.toJSON()).toBe('WARN');
      expect(LogLevel.ERROR.toJSON()).toBe('ERROR');
    });

    it('JSON.stringify()で正しくシリアライズされる', () => {
      const obj = { level: LogLevel.INFO };
      const json = JSON.stringify(obj);

      expect(json).toBe('{"level":"INFO"}');
    });
  });

  describe('不変性', () => {
    it('作成後のログレベルは変更できない', () => {
      const level = LogLevel.INFO;

      expect(() => {
        (level as any).level = 'DEBUG';
      }).toThrow();

      expect(() => {
        (level as any).value = 10;
      }).toThrow();
    });
  });
});
