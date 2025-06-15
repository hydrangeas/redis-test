import { RateLimitLogId } from '../rate-limit-log-id';

describe('RateLimitLogId', () => {
  describe('create', () => {
    it('指定されたIDでRateLimitLogIdを作成できる', () => {
      const id = '650e8400-e29b-41d4-a716-446655440000';
      const result = RateLimitLogId.create(id);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(id);
    });

    it('IDを指定しない場合、新しいUUIDが生成される', () => {
      const result = RateLimitLogId.create();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('複数のIDを作成できる', () => {
      const ids = [
        '750e8400-e29b-41d4-a716-446655440000',
        '850e8400-e29b-41d4-a716-446655440000',
        '950e8400-e29b-41d4-a716-446655440000',
      ];

      ids.forEach((id) => {
        const result = RateLimitLogId.create(id);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(id);
      });
    });
  });

  describe('generate', () => {
    it('新しいRateLimitLogIdを生成できる', () => {
      const rateLimitLogId = RateLimitLogId.generate();

      expect(rateLimitLogId).toBeDefined();
      expect(rateLimitLogId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('生成されるIDは毎回異なる', () => {
      const id1 = RateLimitLogId.generate();
      const id2 = RateLimitLogId.generate();

      expect(id1.value).not.toBe(id2.value);
    });

    it('複数のIDを生成できる', () => {
      const ids = Array.from({ length: 10 }, () => RateLimitLogId.generate());
      const uniqueIds = new Set(ids.map((id) => id.value));

      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('equals', () => {
    it('同じIDのRateLimitLogIdはequalsでtrueを返す', () => {
      const id = '650e8400-e29b-41d4-a716-446655440000';
      const rateLimitLogId1 = RateLimitLogId.create(id).getValue();
      const rateLimitLogId2 = RateLimitLogId.create(id).getValue();

      expect(rateLimitLogId1.equals(rateLimitLogId2)).toBe(true);
    });

    it('異なるIDのRateLimitLogIdはequalsでfalseを返す', () => {
      const rateLimitLogId1 = RateLimitLogId.generate();
      const rateLimitLogId2 = RateLimitLogId.generate();

      expect(rateLimitLogId1.equals(rateLimitLogId2)).toBe(false);
    });

    it('nullまたはundefinedと比較するとfalseを返す', () => {
      const rateLimitLogId = RateLimitLogId.generate();

      expect(rateLimitLogId.equals(null as any)).toBe(false);
      expect(rateLimitLogId.equals(undefined as any)).toBe(false);
    });

    it('異なる型のオブジェクトと比較するとfalseを返す', () => {
      const rateLimitLogId = RateLimitLogId.generate();
      const plainObject = { value: rateLimitLogId.value };

      expect(rateLimitLogId.equals(plainObject as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('文字列表現を返す', () => {
      const id = '650e8400-e29b-41d4-a716-446655440000';
      const rateLimitLogId = RateLimitLogId.create(id).getValue();

      expect(rateLimitLogId.toString()).toBe(id);
    });

    it('generateで作成したIDも文字列に変換できる', () => {
      const rateLimitLogId = RateLimitLogId.generate();
      const stringValue = rateLimitLogId.toString();

      expect(typeof stringValue).toBe('string');
      expect(stringValue).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('toValue', () => {
    it('値を返す', () => {
      const id = '650e8400-e29b-41d4-a716-446655440000';
      const rateLimitLogId = RateLimitLogId.create(id).getValue();

      expect(rateLimitLogId.toValue()).toBe(id);
    });
  });

  describe('hashCode', () => {
    it('ハッシュコードを生成できる', () => {
      const rateLimitLogId = RateLimitLogId.generate();
      const hashCode = rateLimitLogId.hashCode();

      expect(typeof hashCode).toBe('number');
      expect(Number.isFinite(hashCode)).toBe(true);
    });

    it('同じIDは同じハッシュコードを返す', () => {
      const id = '650e8400-e29b-41d4-a716-446655440000';
      const rateLimitLogId1 = RateLimitLogId.create(id).getValue();
      const rateLimitLogId2 = RateLimitLogId.create(id).getValue();

      expect(rateLimitLogId1.hashCode()).toBe(rateLimitLogId2.hashCode());
    });

    it('異なるIDは異なるハッシュコードを返す（多くの場合）', () => {
      const rateLimitLogId1 = RateLimitLogId.generate();
      const rateLimitLogId2 = RateLimitLogId.generate();

      // ハッシュの衝突は起こりうるが、通常は異なる値になる
      // このテストは確率的なので、厳密な保証はできない
      expect(rateLimitLogId1.hashCode()).not.toBe(rateLimitLogId2.hashCode());
    });
  });
});