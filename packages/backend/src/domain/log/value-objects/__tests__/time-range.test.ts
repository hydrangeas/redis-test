import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimeRange } from '../time-range';

describe('TimeRange', () => {
  beforeEach(() => {
    // 固定の日時を設定
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-23T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('有効な開始日時と終了日時で時間範囲を作成する', () => {
      const start = new Date('2025-01-01T00:00:00.000Z');
      const end = new Date('2025-01-31T23:59:59.999Z');
      const result = TimeRange.create(start, end);

      expect(result.isSuccess).toBe(true);
      expect(result.value.start).toEqual(start);
      expect(result.value.end).toEqual(end);
    });

    it('開始日時または終了日時がnullの場合はエラーを返す', () => {
      const date = new Date();

      const result1 = TimeRange.create(null as any, date);
      expect(result1.isFailure).toBe(true);
      expect(result1.error).toBe('開始日時と終了日時は必須です');

      const result2 = TimeRange.create(date, null as any);
      expect(result2.isFailure).toBe(true);
      expect(result2.error).toBe('開始日時と終了日時は必須です');
    });

    it('Date型以外の値の場合はエラーを返す', () => {
      const result = TimeRange.create('2025-01-01' as any, '2025-01-31' as any);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('開始日時と終了日時はDate型である必要があります');
    });

    it('無効な日時の場合はエラーを返す', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date();

      const result = TimeRange.create(invalidDate, validDate);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('無効な日時が指定されました');
    });

    it('開始日時が終了日時より後の場合はエラーを返す', () => {
      const start = new Date('2025-01-31T00:00:00.000Z');
      const end = new Date('2025-01-01T00:00:00.000Z');
      const result = TimeRange.create(start, end);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('開始日時は終了日時より前である必要があります');
    });

    it('1年を超える範囲の場合はエラーを返す', () => {
      const start = new Date('2025-01-01T00:00:00.000Z');
      const end = new Date('2026-01-02T00:00:00.000Z');
      const result = TimeRange.create(start, end);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('時間範囲は最大1年までです');
    });

    it('作成された時間範囲は元の日付オブジェクトとは独立している', () => {
      const start = new Date('2025-01-01T00:00:00.000Z');
      const end = new Date('2025-01-31T23:59:59.999Z');
      const result = TimeRange.create(start, end);

      // 元の日付を変更
      start.setDate(15);

      // 時間範囲の日付は変更されない
      expect(result.value.start.getDate()).toBe(1);
    });
  });

  describe('便利なファクトリメソッド', () => {
    it('lastHours()で過去N時間の範囲を作成する', () => {
      const range = TimeRange.lastHours(24);

      expect(range.start).toEqual(new Date('2025-01-22T10:00:00.000Z'));
      expect(range.end).toEqual(new Date('2025-01-23T10:00:00.000Z'));
    });

    it('lastDays()で過去N日間の範囲を作成する', () => {
      const range = TimeRange.lastDays(7);

      expect(range.start).toEqual(new Date('2025-01-16T10:00:00.000Z'));
      expect(range.end).toEqual(new Date('2025-01-23T10:00:00.000Z'));
    });

    it('today()で今日の範囲を作成する', () => {
      const range = TimeRange.today();

      expect(range.start).toEqual(new Date('2025-01-23T00:00:00.000Z'));
      expect(range.end).toEqual(new Date('2025-01-23T23:59:59.999Z'));
    });

    it('thisMonth()で今月の範囲を作成する', () => {
      const range = TimeRange.thisMonth();

      expect(range.start).toEqual(new Date('2025-01-01T00:00:00.000Z'));
      expect(range.end).toEqual(new Date('2025-01-31T23:59:59.999Z'));
    });
  });

  describe('contains', () => {
    it('範囲内の日時は含まれると判定される', () => {
      const range = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-31T23:59:59.999Z'),
      ).value;

      expect(range.contains(new Date('2025-01-15T12:00:00.000Z'))).toBe(true);
      expect(range.contains(new Date('2025-01-01T00:00:00.000Z'))).toBe(true);
      expect(range.contains(new Date('2025-01-31T23:59:59.999Z'))).toBe(true);
    });

    it('範囲外の日時は含まれないと判定される', () => {
      const range = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-31T23:59:59.999Z'),
      ).value;

      expect(range.contains(new Date('2024-12-31T23:59:59.999Z'))).toBe(false);
      expect(range.contains(new Date('2025-02-01T00:00:00.000Z'))).toBe(false);
    });

    it('無効な入力の場合はfalseを返す', () => {
      const range = TimeRange.today();

      expect(range.contains(null as any)).toBe(false);
      expect(range.contains('2025-01-15' as any)).toBe(false);
    });
  });

  describe('期間の計算', () => {
    it('getDurationInMilliseconds()でミリ秒単位の期間を取得する', () => {
      const range = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-01T01:00:00.000Z'),
      ).value;

      expect(range.getDurationInMilliseconds()).toBe(60 * 60 * 1000);
    });

    it('getDurationInHours()で時間単位の期間を取得する', () => {
      const range = TimeRange.lastHours(24);

      expect(range.getDurationInHours()).toBe(24);
    });

    it('getDurationInDays()で日数単位の期間を取得する', () => {
      const range = TimeRange.lastDays(7);

      expect(range.getDurationInDays()).toBe(7);
    });
  });

  describe('overlaps', () => {
    it('重複する時間範囲を正しく判定する', () => {
      const range1 = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-15T00:00:00.000Z'),
      ).value;

      const range2 = TimeRange.create(
        new Date('2025-01-10T00:00:00.000Z'),
        new Date('2025-01-20T00:00:00.000Z'),
      ).value;

      expect(range1.overlaps(range2)).toBe(true);
      expect(range2.overlaps(range1)).toBe(true);
    });

    it('重複しない時間範囲を正しく判定する', () => {
      const range1 = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-10T00:00:00.000Z'),
      ).value;

      const range2 = TimeRange.create(
        new Date('2025-01-11T00:00:00.000Z'),
        new Date('2025-01-20T00:00:00.000Z'),
      ).value;

      expect(range1.overlaps(range2)).toBe(false);
      expect(range2.overlaps(range1)).toBe(false);
    });

    it('境界で接する時間範囲は重複すると判定される', () => {
      const range1 = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-10T00:00:00.000Z'),
      ).value;

      const range2 = TimeRange.create(
        new Date('2025-01-10T00:00:00.000Z'),
        new Date('2025-01-20T00:00:00.000Z'),
      ).value;

      expect(range1.overlaps(range2)).toBe(true);
    });
  });

  describe('equals', () => {
    it('同じ開始日時と終了日時の範囲は等しい', () => {
      const start = new Date('2025-01-01T00:00:00.000Z');
      const end = new Date('2025-01-31T23:59:59.999Z');

      const range1 = TimeRange.create(start, end).value;
      const range2 = TimeRange.create(start, end).value;

      expect(range1.equals(range2)).toBe(true);
    });

    it('異なる時間範囲は等しくない', () => {
      const range1 = TimeRange.lastDays(7);
      const range2 = TimeRange.lastDays(14);

      expect(range1.equals(range2)).toBe(false);
    });
  });

  describe('シリアライゼーション', () => {
    it('toString()で読みやすい形式の文字列を返す', () => {
      const range = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-31T23:59:59.999Z'),
      ).value;

      expect(range.toString()).toBe('2025-01-01T00:00:00.000Z - 2025-01-31T23:59:59.999Z');
    });

    it('toJSON()でJSONシリアライズ可能なオブジェクトを返す', () => {
      const range = TimeRange.create(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-31T23:59:59.999Z'),
      ).value;

      expect(range.toJSON()).toEqual({
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-01-31T23:59:59.999Z',
      });
    });
  });
});
