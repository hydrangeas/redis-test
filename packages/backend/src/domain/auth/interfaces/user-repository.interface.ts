
import type { User } from '../entities/user';
import type { Email } from '../value-objects/email';
import type { UserId } from '../value-objects/user-id';
import type { Result } from '@/domain/errors/result';

/**
 * ユーザーリポジトリインターフェース
 *
 * ユーザー情報の永続化と取得を担当する
 */
export interface IUserRepository {
  /**
   * IDによるユーザー検索
   */
  findById(id: UserId): Promise<Result<User | null>>;

  /**
   * メールアドレスによるユーザー検索
   */
  findByEmail(email: Email): Promise<Result<User | null>>;

  /**
   * ユーザーの保存（新規作成）
   */
  save(user: User): Promise<Result<void>>;

  /**
   * ユーザーの更新
   */
  update(user: User): Promise<Result<void>>;

  /**
   * ユーザーの削除
   */
  delete(id: UserId): Promise<Result<void>>;
}
