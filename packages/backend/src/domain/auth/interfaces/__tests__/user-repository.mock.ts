import { vi } from 'vitest';

import { DomainError } from '@/domain/errors';
import { Result } from '@/domain/errors/result';


import type { User } from '../../entities/user';
import type { Email } from '../../value-objects/email';
import type { UserId } from '../../value-objects/user-id';
import type { IUserRepository } from '../user-repository.interface';


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

  findById(id: UserId): Promise<Result<User | null>> {
    this.findByIdSpy(id);
    const user = this.users.get(id.value);
    return Promise.resolve(Result.ok(user || null));
  }

  findByEmail(email: Email): Promise<Result<User | null>> {
    this.findByEmailSpy(email);
    const user = Array.from(this.users.values()).find((u) => u.email.equals(email));
    return Promise.resolve(Result.ok(user || null));
  }

  save(user: User): Promise<Result<void>> {
    this.saveSpy(user);
    this.users.set(user.id.value, user);
    return Promise.resolve(Result.ok(undefined));
  }

  update(user: User): Promise<Result<void>> {
    this.updateSpy(user);
    if (!this.users.has(user.id.value)) {
      return Promise.resolve(Result.fail(DomainError.notFound('USER_NOT_FOUND', 'User not found')));
    }
    this.users.set(user.id.value, user);
    return Promise.resolve(Result.ok(undefined));
  }

  delete(id: UserId): Promise<Result<void>> {
    this.deleteSpy(id);
    const deleted = this.users.delete(id.value);
    if (!deleted) {
      return Promise.resolve(Result.fail(DomainError.notFound('USER_NOT_FOUND', 'User not found')));
    }
    return Promise.resolve(Result.ok(undefined));
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
