import { IUserRepository } from '../user-repository.interface';
import { Result } from '@/domain/shared/result';
import { User } from '../../entities/user';
import { UserId } from '../../value-objects/user-id';
import { Email } from '../../value-objects/email';
import { vi } from 'vitest';

/**
 * ユーザーリポジトリのモック実装
 * テスト用のインメモリリポジトリ
 */
export class MockUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();
  
  // モック用のスパイ関数
  public saveSpy = vi.fn();
  public updateSpy = vi.fn();
  public deleteSpy = vi.fn();
  public findByIdSpy = vi.fn();
  public findByEmailSpy = vi.fn();

  async findById(id: UserId): Promise<Result<User | null>> {
    this.findByIdSpy(id);
    const user = this.users.get(id.value);
    return Result.ok(user || null);
  }

  async findByEmail(email: Email): Promise<Result<User | null>> {
    this.findByEmailSpy(email);
    const user = Array.from(this.users.values()).find(
      u => u.email.equals(email)
    );
    return Result.ok(user || null);
  }

  async save(user: User): Promise<Result<void>> {
    this.saveSpy(user);
    this.users.set(user.id.value, user);
    return Result.ok();
  }

  async update(user: User): Promise<Result<void>> {
    this.updateSpy(user);
    if (!this.users.has(user.id.value)) {
      return Result.fail(new Error('User not found'));
    }
    this.users.set(user.id.value, user);
    return Result.ok();
  }

  async delete(id: UserId): Promise<Result<void>> {
    this.deleteSpy(id);
    const deleted = this.users.delete(id.value);
    if (!deleted) {
      return Result.fail(new Error('User not found'));
    }
    return Result.ok();
  }

  // テストヘルパーメソッド
  clear(): void {
    this.users.clear();
    this.saveSpy.mockClear();
    this.updateSpy.mockClear();
    this.deleteSpy.mockClear();
    this.findByIdSpy.mockClear();
    this.findByEmailSpy.mockClear();
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  count(): number {
    return this.users.size;
  }
}