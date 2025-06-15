import { MockUserRepository } from './user-repository.mock';
import { User } from '../../entities/user';
import { UserId } from '../../value-objects/user-id';
import { Email } from '../../value-objects/email';
import { UserTier } from '../../value-objects/user-tier';
import { TierLevel } from '../../value-objects/tier-level';

describe('UserRepository Integration Tests', () => {
  let repository: MockUserRepository;
  let testUser: User;

  beforeEach(() => {
    repository = new MockUserRepository();
    
    const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
    const emailResult = Email.create('test@example.com');
    const tierResult = UserTier.create(TierLevel.TIER1);
    
    if (userIdResult.isFailure || emailResult.isFailure || tierResult.isFailure) {
      throw new Error('Failed to create test data');
    }
    
    testUser = User.create({
      id: userIdResult.getValue(),
      email: emailResult.getValue(),
      tier: tierResult.getValue(),
    }).getValue();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('save', () => {
    it('新しいユーザーを保存できる', async () => {
      const result = await repository.save(testUser);

      expect(result.isSuccess).toBe(true);
      expect(repository.saveSpy).toHaveBeenCalledWith(testUser);
      expect(repository.count()).toBe(1);
    });

    it('複数のユーザーを保存できる', async () => {
      const user2Id = UserId.fromString('650e8400-e29b-41d4-a716-446655440000');
      const user2Email = Email.create('user2@example.com');
      const user2Tier = UserTier.create(TierLevel.TIER2);
      
      if (user2Email.isFailure || user2Tier.isFailure) {
        throw new Error('Failed to create test data');
      }
      
      const user2 = User.create({
        id: user2Id,
        email: user2Email.getValue(),
        tier: user2Tier.getValue(),
      }).getValue();

      await repository.save(testUser);
      await repository.save(user2);

      expect(repository.count()).toBe(2);
    });
  });

  describe('findById', () => {
    it('IDでユーザーを検索できる', async () => {
      await repository.save(testUser);

      const result = await repository.findById(testUser.id);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testUser);
      expect(repository.findByIdSpy).toHaveBeenCalledWith(testUser.id);
    });

    it('存在しないIDの場合nullを返す', async () => {
      const nonExistentId = UserId.fromString('999e8400-e29b-41d4-a716-446655440000');
      
      const result = await repository.findById(nonExistentId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('メールアドレスでユーザーを検索できる', async () => {
      await repository.save(testUser);

      const result = await repository.findByEmail(testUser.email);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testUser);
      expect(repository.findByEmailSpy).toHaveBeenCalledWith(testUser.email);
    });

    it('存在しないメールアドレスの場合nullを返す', async () => {
      const nonExistentEmailResult = Email.create('nonexistent@example.com');
      if (nonExistentEmailResult.isFailure) {
        throw new Error('Failed to create email');
      }
      const nonExistentEmail = nonExistentEmailResult.getValue();
      
      const result = await repository.findByEmail(nonExistentEmail);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('update', () => {
    it('既存のユーザーを更新できる', async () => {
      await repository.save(testUser);

      const newEmailResult = Email.create('updated@example.com');
      if (newEmailResult.isFailure) {
        throw new Error('Failed to create email');
      }
      const newEmail = newEmailResult.getValue();
      testUser.updateEmail(newEmail);

      const result = await repository.update(testUser);

      expect(result.isSuccess).toBe(true);
      expect(repository.updateSpy).toHaveBeenCalledWith(testUser);

      const found = await repository.findById(testUser.id);
      expect(found.getValue()?.email.value).toBe('updated@example.com');
    });

    it('存在しないユーザーの更新は失敗する', async () => {
      const result = await repository.update(testUser);

      expect(result.isFailure).toBe(true);
      expect(result.error?.message).toBe('User not found');
    });
  });

  describe('delete', () => {
    it('ユーザーを削除できる', async () => {
      await repository.save(testUser);

      const result = await repository.delete(testUser.id);

      expect(result.isSuccess).toBe(true);
      expect(repository.deleteSpy).toHaveBeenCalledWith(testUser.id);
      expect(repository.count()).toBe(0);
    });

    it('存在しないユーザーの削除は失敗する', async () => {
      const nonExistentId = UserId.fromString('999e8400-e29b-41d4-a716-446655440000');
      
      const result = await repository.delete(nonExistentId);

      expect(result.isFailure).toBe(true);
      expect(result.error?.message).toBe('User not found');
    });
  });

  describe('複雑なシナリオ', () => {
    it('CRUD操作の完全なフロー', async () => {
      // Create
      await repository.save(testUser);
      expect(repository.count()).toBe(1);

      // Read
      const foundById = await repository.findById(testUser.id);
      expect(foundById.getValue()).toBe(testUser);

      const foundByEmail = await repository.findByEmail(testUser.email);
      expect(foundByEmail.getValue()).toBe(testUser);

      // Update
      const newTierResult = UserTier.create(TierLevel.TIER2);
      if (newTierResult.isFailure) {
        throw new Error('Failed to create tier');
      }
      const newTier = newTierResult.getValue();
      testUser.updateTier(newTier);
      await repository.update(testUser);

      const updated = await repository.findById(testUser.id);
      expect(updated.getValue()?.tier.level).toBe(TierLevel.TIER2);

      // Delete
      await repository.delete(testUser.id);
      expect(repository.count()).toBe(0);

      const deletedUser = await repository.findById(testUser.id);
      expect(deletedUser.getValue()).toBeNull();
    });

    it('複数ユーザーの管理', async () => {
      const users = Array.from({ length: 5 }, (_, i) => {
        const userId = UserId.fromString(`${i}50e8400-e29b-41d4-a716-446655440000`);
        const emailResult = Email.create(`user${i}@example.com`);
        const tierLevel = i % 3 === 0 ? TierLevel.TIER1 : i % 3 === 1 ? TierLevel.TIER2 : TierLevel.TIER3;
        const tierResult = UserTier.create(tierLevel);
        
        if (emailResult.isFailure || tierResult.isFailure) {
          throw new Error('Failed to create test data');
        }
        
        return User.create({
          id: userId,
          email: emailResult.getValue(),
          tier: tierResult.getValue(),
        }).getValue();
      });

      // すべて保存
      for (const user of users) {
        await repository.save(user);
      }

      expect(repository.count()).toBe(5);

      // 特定のメールで検索
      const searchEmailResult = Email.create('user2@example.com');
      if (searchEmailResult.isFailure) {
        throw new Error('Failed to create email');
      }
      const found = await repository.findByEmail(searchEmailResult.getValue());
      expect(found.getValue()?.id.value).toBe('250e8400-e29b-41d4-a716-446655440000');

      // いくつか削除
      await repository.delete(users[0].id);
      await repository.delete(users[1].id);

      expect(repository.count()).toBe(3);
    });
  });
});