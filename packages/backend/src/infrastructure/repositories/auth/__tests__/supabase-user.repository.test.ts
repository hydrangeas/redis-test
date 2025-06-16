import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseUserRepository } from '../supabase-user.repository';
import { MockSupabaseAuthAdapter } from '@/infrastructure/auth/__mocks__/supabase-auth.adapter';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Email } from '@/domain/auth/value-objects/email';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { User } from '@/domain/auth/entities/user';
import { createMockLogger } from '@/test/mocks/logger.mock';

describe('SupabaseUserRepository', () => {
  let repository: SupabaseUserRepository;
  let mockAuthAdapter: MockSupabaseAuthAdapter;
  let mockLogger: any;

  beforeEach(() => {
    mockAuthAdapter = new MockSupabaseAuthAdapter();
    mockLogger = createMockLogger();
    // デバッグログを表示するように設定
    mockLogger.debug = vi.fn((obj, msg) => console.log('DEBUG:', msg, obj));
    mockLogger.error = vi.fn((obj, msg) => console.error('ERROR:', msg, obj));
    repository = new SupabaseUserRepository(mockAuthAdapter, mockLogger);
  });

  describe('findById', () => {
    it('既存のユーザーを正常に取得できる', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const userIdResult = UserId.create(userId);
      if (!userIdResult.isSuccess) {
        throw new Error(`Failed to create UserId: ${userIdResult.getError().message}`);
      }
      const userIdVO = userIdResult.getValue();

      const result = await repository.findById(userIdVO);

      if (!result.isSuccess) {
        console.error('Repository error:', result.getError());
      }

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).not.toBeNull();
      expect(result.getValue()?.id.value).toBe(userId);
      expect(result.getValue()?.email.value).toBe('test@example.com');
      expect(result.getValue()?.tier.level).toBe(TierLevel.TIER1);
    });

    it('存在しないユーザーの場合nullを返す', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001'; // 存在しないがvalid UUID v4
      const userIdResult = UserId.create(userId);
      if (!userIdResult.isSuccess) {
        throw new Error(`Failed to create UserId: ${userIdResult.getError().message}`);
      }
      const userIdVO = userIdResult.getValue();

      const result = await repository.findById(userIdVO);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });

    it('エラーが発生した場合は失敗を返す', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const userIdVO = UserId.create(userId).getValue();

      vi.spyOn(mockAuthAdapter, 'getUserById').mockRejectedValue(new Error('Database error'));

      const result = await repository.findById(userIdVO);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('USER_REPOSITORY_ERROR');
    });
  });

  describe('findByEmail', () => {
    it('既存のユーザーをメールアドレスで取得できる', async () => {
      const email = 'test@example.com';
      const emailVO = Email.create(email).getValue();

      const result = await repository.findByEmail(emailVO);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).not.toBeNull();
      expect(result.getValue()?.email.value).toBe(email);
    });

    it('存在しないメールアドレスの場合nullを返す', async () => {
      const email = 'nonexistent@example.com';
      const emailVO = Email.create(email).getValue();

      const result = await repository.findByEmail(emailVO);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('save', () => {
    it('新しいユーザーを正常に保存できる', async () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      if (!userIdResult.isSuccess) {
        throw new Error(`Failed to create UserId: ${userIdResult.getError().message}`);
      }
      const userId = userIdResult.getValue();

      const emailResult = Email.create('newuser@example.com');
      if (!emailResult.isSuccess) {
        throw new Error(`Failed to create Email: ${emailResult.getError().message}`);
      }
      const email = emailResult.getValue();

      const tierResult = UserTier.create(TierLevel.TIER1);
      if (!tierResult.isSuccess) {
        throw new Error(`Failed to create UserTier: ${tierResult.getError().message}`);
      }
      const tier = tierResult.getValue();

      const userResult = User.create({
        id: userId,
        email: email,
        tier: tier,
        emailVerified: true,
      });

      const user = userResult.getValue();

      const result = await repository.save(user);

      expect(result.isSuccess).toBe(true);

      // モックで作成されたことを確認
      const createdUser = await mockAuthAdapter.getUserById(user.id.value);
      expect(createdUser).not.toBeNull();
      expect(createdUser.email).toBe('newuser@example.com');
    });

    it('ユーザー作成に失敗した場合はエラーを返す', async () => {
      vi.spyOn(mockAuthAdapter, 'createUser').mockResolvedValue(null);

      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      if (!userIdResult.isSuccess) {
        throw new Error(`Failed to create UserId: ${userIdResult.getError().message}`);
      }
      const userId = userIdResult.getValue();

      const emailResult = Email.create('newuser@example.com');
      if (!emailResult.isSuccess) {
        throw new Error(`Failed to create Email: ${emailResult.getError().message}`);
      }
      const email = emailResult.getValue();

      const tierResult = UserTier.create(TierLevel.TIER1);
      if (!tierResult.isSuccess) {
        throw new Error(`Failed to create UserTier: ${tierResult.getError().message}`);
      }
      const tier = tierResult.getValue();

      const userResult = User.create({
        id: userId,
        email: email,
        tier: tier,
      });

      const user = userResult.getValue();

      const result = await repository.save(user);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('USER_CREATION_FAILED');
    });
  });

  describe('update', () => {
    it('既存のユーザーを正常に更新できる', async () => {
      // 既存のユーザーを取得
      const userId = UserId.create('123e4567-e89b-12d3-a456-426614174000').getValue();
      const findResult = await repository.findById(userId);
      const existingUser = findResult.getValue()!;

      // メールアドレスを更新
      const newEmail = Email.create('updated@example.com').getValue();
      existingUser.updateEmail(newEmail);

      const result = await repository.update(existingUser);

      expect(result.isSuccess).toBe(true);

      // モックで更新されたことを確認
      const updatedUser = await mockAuthAdapter.getUserById(existingUser.id.value);
      expect(updatedUser.email).toBe('updated@example.com');
    });

    it('ユーザー更新に失敗した場合はエラーを返す', async () => {
      vi.spyOn(mockAuthAdapter, 'updateUser').mockResolvedValue(null);

      const userId = UserId.create('123e4567-e89b-12d3-a456-426614174000').getValue();
      const findResult = await repository.findById(userId);
      const existingUser = findResult.getValue()!;

      const result = await repository.update(existingUser);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('USER_UPDATE_FAILED');
    });
  });

  describe('delete', () => {
    it('既存のユーザーを正常に削除できる', async () => {
      const userId = UserId.create('123e4567-e89b-12d3-a456-426614174000').getValue();

      const result = await repository.delete(userId);

      expect(result.isSuccess).toBe(true);

      // モックで削除されたことを確認
      const deletedUser = await mockAuthAdapter.getUserById(userId.value);
      expect(deletedUser).toBeNull();
    });

    it('ユーザー削除に失敗した場合はエラーを返す', async () => {
      vi.spyOn(mockAuthAdapter, 'deleteUser').mockResolvedValue(false);

      const userId = UserId.create('123e4567-e89b-12d3-a456-426614174000').getValue();

      const result = await repository.delete(userId);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('USER_DELETION_FAILED');
    });
  });

  describe('mapToDomainUser', () => {
    it('Supabaseユーザーを正しくドメインモデルに変換できる', async () => {
      const supabaseUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        last_sign_in_at: '2024-01-03T00:00:00Z',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        app_metadata: { tier: 'tier2' },
        user_metadata: { foo: 'bar' },
      };

      mockAuthAdapter.setMockUser(supabaseUser);

      const userId = UserId.create(supabaseUser.id).getValue();
      const result = await repository.findById(userId);

      const user = result.getValue()!;
      expect(user.id.value).toBe(supabaseUser.id);
      expect(user.email.value).toBe(supabaseUser.email);
      expect(user.tier.level).toBe(TierLevel.TIER2);
      expect(user.emailVerified).toBe(true);
      expect(user.metadata).toEqual({ foo: 'bar' });
      expect(user.lastAuthenticatedAt).toEqual(new Date('2024-01-03T00:00:00Z'));
    });

    it('デフォルト値を適切に処理できる', async () => {
      const supabaseUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        // updated_at, last_sign_in_at は未設定
        email_confirmed_at: null, // 明示的にnullを設定
        // app_metadata, user_metadata は未設定
      };

      mockAuthAdapter.setMockUser(supabaseUser);

      const userId = UserId.create(supabaseUser.id).getValue();
      const result = await repository.findById(userId);

      const user = result.getValue()!;
      expect(user.tier.level).toBe(TierLevel.TIER1); // デフォルトはTIER1
      expect(user.emailVerified).toBe(false); // email_confirmed_at が undefined なのでfalse
      expect(user.metadata).toEqual({}); // デフォルトは空オブジェクト
      expect(user.lastAuthenticatedAt).toBeUndefined();
    });
  });
});
