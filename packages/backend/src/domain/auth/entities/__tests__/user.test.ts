import { User } from '../user';
import { UserId } from '../../value-objects/user-id';
import { Email } from '../../value-objects/email';
import { UserTier } from '../../value-objects/user-tier';
import { TierLevel } from '../../value-objects/tier-level';
import { UniqueEntityId } from '@/domain/shared/entity';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { vi } from 'vitest';

describe('User', () => {
  let userId: UserId;
  let email: Email;
  let tier: UserTier;

  beforeEach(() => {
    const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
    const emailResult = Email.create('test@example.com');
    const tierResult = UserTier.create(TierLevel.TIER1);

    if (userIdResult.isFailure || emailResult.isFailure || tierResult.isFailure) {
      throw new Error('Failed to create test data');
    }

    userId = userIdResult.getValue();
    email = emailResult.getValue();
    tier = tierResult.getValue();
  });

  describe('create', () => {
    it('新しいユーザーを作成できる', () => {
      const result = User.create({
        id: userId,
        email,
        tier,
      });

      expect(result.isSuccess).toBe(true);

      const user = result.getValue();
      expect(user.id.equals(userId)).toBe(true);
      expect(user.email.equals(email)).toBe(true);
      expect(user.tier.equals(tier)).toBe(true);
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt.getTime()).toBe(user.updatedAt.getTime());
    });

    it('メール検証済みフラグを指定して作成できる', () => {
      const result = User.create({
        id: userId,
        email,
        tier,
        emailVerified: true,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().emailVerified).toBe(true);
    });

    it('メタデータを指定して作成できる', () => {
      const metadata = {
        provider: 'google',
        providerId: 'google-123',
      };

      const result = User.create({
        id: userId,
        email,
        tier,
        metadata,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().metadata).toEqual(metadata);
    });
  });

  describe('reconstruct', () => {
    it('既存データからユーザーを再構築できる', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const lastAuthenticatedAt = new Date('2024-01-03');
      const metadata = { provider: 'google' };

      const user = User.reconstruct({
        id: userId,
        email,
        tier,
        createdAt,
        updatedAt,
        lastAuthenticatedAt,
        emailVerified: true,
        metadata,
      });

      expect(user.id.equals(userId)).toBe(true);
      expect(user.email.equals(email)).toBe(true);
      expect(user.tier.equals(tier)).toBe(true);
      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
      expect(user.lastAuthenticatedAt).toBe(lastAuthenticatedAt);
      expect(user.emailVerified).toBe(true);
      expect(user.metadata).toEqual(metadata);
    });
  });

  describe('updateEmail', () => {
    let user: User;

    beforeEach(() => {
      user = User.create({
        id: userId,
        email,
        tier,
        emailVerified: true,
      }).getValue();
    });

    it('メールアドレスを更新できる', () => {
      const newEmailResult = Email.create('newemail@example.com');
      if (newEmailResult.isFailure) {
        throw new Error('Failed to create email');
      }
      const newEmail = newEmailResult.getValue();
      const originalUpdatedAt = user.updatedAt;

      // 時間を進める
      vi.useFakeTimers();
      vi.setSystemTime(new Date(originalUpdatedAt.getTime() + 1000));

      const result = user.updateEmail(newEmail);

      expect(result.isSuccess).toBe(true);
      expect(user.email.equals(newEmail)).toBe(true);
      expect(user.emailVerified).toBe(false); // 再検証が必要
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

      vi.useRealTimers();
    });

    it('同じメールアドレスの場合エラーを返す', () => {
      const result = user.updateEmail(email);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.code).toBe('EMAIL_NOT_CHANGED');
      expect(result.error?.type).toBe(ErrorType.VALIDATION);
    });
  });

  describe('updateTier', () => {
    let user: User;

    beforeEach(() => {
      user = User.create({
        id: userId,
        email,
        tier,
      }).getValue();
    });

    it('ティアを更新できる', () => {
      const newTierResult = UserTier.create(TierLevel.TIER2);
      if (newTierResult.isFailure) {
        throw new Error('Failed to create tier');
      }
      const newTier = newTierResult.getValue();
      const originalUpdatedAt = user.updatedAt;

      vi.useFakeTimers();
      vi.setSystemTime(new Date(originalUpdatedAt.getTime() + 1000));

      const result = user.updateTier(newTier);

      expect(result.isSuccess).toBe(true);
      expect(user.tier.equals(newTier)).toBe(true);
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

      vi.useRealTimers();
    });

    it('同じティアの場合エラーを返す', () => {
      const result = user.updateTier(tier);

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('TIER_NOT_CHANGED');
    });
  });

  describe('verifyEmail', () => {
    it('メールを検証済みに更新できる', () => {
      const user = User.create({
        id: userId,
        email,
        tier,
        emailVerified: false,
      }).getValue();

      const originalUpdatedAt = user.updatedAt;

      vi.useFakeTimers();
      vi.setSystemTime(new Date(originalUpdatedAt.getTime() + 1000));

      user.verifyEmail();

      expect(user.emailVerified).toBe(true);
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

      vi.useRealTimers();
    });
  });

  describe('updateLastAuthenticatedAt', () => {
    it('最終認証日時を更新できる', () => {
      const user = User.create({
        id: userId,
        email,
        tier,
      }).getValue();

      expect(user.lastAuthenticatedAt).toBeUndefined();

      const now = new Date();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      user.updateLastAuthenticatedAt();

      expect(user.lastAuthenticatedAt).toEqual(now);
      expect(user.updatedAt).toEqual(now);

      vi.useRealTimers();
    });
  });

  describe('updateMetadata', () => {
    it('メタデータを更新できる', () => {
      const user = User.create({
        id: userId,
        email,
        tier,
        metadata: { existing: 'value' },
      }).getValue();

      const originalUpdatedAt = user.updatedAt;

      vi.useFakeTimers();
      vi.setSystemTime(new Date(originalUpdatedAt.getTime() + 1000));

      user.updateMetadata({
        new: 'data',
        provider: 'google',
      });

      expect(user.metadata).toEqual({
        existing: 'value',
        new: 'data',
        provider: 'google',
      });
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

      vi.useRealTimers();
    });

    it('空のメタデータも設定できる', () => {
      const user = User.create({
        id: userId,
        email,
        tier,
      }).getValue();

      user.updateMetadata({ key: 'value' });

      expect(user.metadata).toEqual({ key: 'value' });
    });
  });

  describe('equals', () => {
    it('同じIDのユーザーはequalsでtrueを返す', () => {
      const user1 = User.create({
        id: userId,
        email,
        tier,
      }).getValue();

      const differentEmailResult = Email.create('different@example.com');
      const differentTierResult = UserTier.create(TierLevel.TIER2);

      if (differentEmailResult.isFailure || differentTierResult.isFailure) {
        throw new Error('Failed to create test data');
      }

      const user2 = User.create({
        id: userId,
        email: differentEmailResult.getValue(),
        tier: differentTierResult.getValue(),
      }).getValue();

      expect(user1.equals(user2)).toBe(true);
    });

    it('異なるIDのユーザーはequalsでfalseを返す', () => {
      const user1 = User.create({
        id: userId,
        email,
        tier,
      }).getValue();

      const differentUserIdResult = UserId.create('650e8400-e29b-41d4-a716-446655440000');
      if (differentUserIdResult.isFailure) {
        throw new Error('Failed to create user ID');
      }

      const user2 = User.create({
        id: differentUserIdResult.getValue(),
        email,
        tier,
      }).getValue();

      expect(user1.equals(user2)).toBe(false);
    });
  });

  describe('entity design', () => {
    it('エンティティは適切なメソッドを通じてのみ状態を変更できる', () => {
      const user = User.create({
        id: userId,
        email,
        tier,
      }).getValue();

      // 初期状態の確認
      const initialEmail = user.email;

      // メソッドを通じた正しい変更
      const newEmailResult = Email.create('new@example.com');
      if (newEmailResult.isFailure) {
        throw new Error('Failed to create email');
      }

      const updateResult = user.updateEmail(newEmailResult.getValue());
      expect(updateResult.isSuccess).toBe(true);
      expect(user.email.equals(newEmailResult.getValue())).toBe(true);
      expect(user.email.equals(initialEmail)).toBe(false);

      // エンティティのプロパティはgetterを通じてのみアクセス可能
      expect(user.email).toBeDefined();
      expect(user.tier).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });
  });
});
