import { describe, it, expect } from 'vitest';
import { LogId } from '../log-id';

describe('LogId', () => {
  describe('generate', () => {
    it('新しいUUID形式のログIDを生成する', () => {
      const logId = LogId.generate();
      
      expect(logId).toBeDefined();
      expect(logId.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('生成されるログIDは毎回異なる', () => {
      const logId1 = LogId.generate();
      const logId2 = LogId.generate();
      
      expect(logId1.value).not.toBe(logId2.value);
    });
  });

  describe('create', () => {
    it('有効なUUID形式の値からログIDを作成する', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = LogId.create(uuid);
      
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe(uuid);
    });

    it('空の値の場合はエラーを返す', () => {
      const result = LogId.create('');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('ログIDは空にできません');
    });

    it('スペースのみの値の場合はエラーを返す', () => {
      const result = LogId.create('   ');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('ログIDは空にできません');
    });

    it('無効なUUID形式の場合はエラーを返す', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-44665544000g',
        '550e8400e29b41d4a716446655440000',
      ];

      invalidUuids.forEach(invalid => {
        const result = LogId.create(invalid);
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('ログIDは有効なUUID形式である必要があります');
      });
    });
  });

  describe('equals', () => {
    it('同じ値のログIDは等しいと判定される', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const logId1 = LogId.create(uuid).value;
      const logId2 = LogId.create(uuid).value;
      
      expect(logId1.equals(logId2)).toBe(true);
    });

    it('異なる値のログIDは等しくないと判定される', () => {
      const logId1 = LogId.generate();
      const logId2 = LogId.generate();
      
      expect(logId1.equals(logId2)).toBe(false);
    });

    it('nullまたはundefinedとの比較はfalseを返す', () => {
      const logId = LogId.generate();
      
      expect(logId.equals(null as any)).toBe(false);
      expect(logId.equals(undefined as any)).toBe(false);
    });
  });

  describe('hashCode', () => {
    it('同じ値のログIDは同じハッシュコードを持つ', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const logId1 = LogId.create(uuid).value;
      const logId2 = LogId.create(uuid).value;
      
      expect(logId1.hashCode()).toBe(logId2.hashCode());
    });

    it('異なる値のログIDは異なるハッシュコードを持つ可能性が高い', () => {
      const logId1 = LogId.generate();
      const logId2 = LogId.generate();
      
      // ハッシュコードの衝突は可能だが、確率は低い
      expect(logId1.hashCode()).not.toBe(logId2.hashCode());
    });
  });

  describe('toString', () => {
    it('ログIDの文字列表現を返す', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const logId = LogId.create(uuid).value;
      
      expect(logId.toString()).toBe(uuid);
    });
  });

  describe('不変性', () => {
    it('作成後のログIDは変更できない', () => {
      const logId = LogId.generate();
      
      expect(() => {
        (logId as any).value = 'new-value';
      }).toThrow();
    });
  });
});