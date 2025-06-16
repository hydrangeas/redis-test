import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { User, UserProps } from '@/domain/auth/entities/user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Email } from '@/domain/auth/value-objects/email';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { IAuthAdapter } from '@/infrastructure/auth/interfaces/auth-adapter.interface';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

/**
 * Supabaseユーザーリポジトリ実装
 *
 * Supabase Authと連携してユーザー情報を管理する
 */
@injectable()
export class SupabaseUserRepository implements IUserRepository {
  constructor(
    @inject(DI_TOKENS.AuthAdapter)
    private readonly authAdapter: IAuthAdapter,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  /**
   * IDによるユーザー検索
   */
  async findById(id: UserId): Promise<Result<User | null>> {
    try {
      this.logger.debug({ userId: id.value }, 'Finding user by ID');

      // Supabase Authからユーザー情報を取得
      const supabaseUser = await this.authAdapter.getUserById(id.value);

      if (!supabaseUser) {
        this.logger.debug({ userId: id.value }, 'User not found');
        return Result.ok(null);
      }

      // Supabaseユーザーからドメインモデルへ変換
      const user = await this.mapToDomainUser(supabaseUser);

      if (!user) {
        return Result.fail(
          new DomainError(
            'USER_MAPPING_ERROR',
            'Failed to map user data to domain model',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.debug({ userId: id.value }, 'User found successfully');
      return Result.ok(user);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: id.value,
        },
        'Error finding user by ID',
      );

      return Result.fail(
        new DomainError('USER_REPOSITORY_ERROR', 'Failed to find user by ID', ErrorType.INTERNAL),
      );
    }
  }

  /**
   * メールアドレスによるユーザー検索
   */
  async findByEmail(email: Email): Promise<Result<User | null>> {
    try {
      this.logger.debug({ email: email.value }, 'Finding user by email');

      // Supabase Authからユーザー情報を取得
      const supabaseUser = await this.authAdapter.getUserByEmail(email.value);

      if (!supabaseUser) {
        this.logger.debug({ email: email.value }, 'User not found');
        return Result.ok(null);
      }

      // Supabaseユーザーからドメインモデルへ変換
      const user = await this.mapToDomainUser(supabaseUser);

      if (!user) {
        return Result.fail(
          new DomainError(
            'USER_MAPPING_ERROR',
            'Failed to map user data to domain model',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.debug({ email: email.value }, 'User found successfully');
      return Result.ok(user);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: email.value,
        },
        'Error finding user by email',
      );

      return Result.fail(
        new DomainError(
          'USER_REPOSITORY_ERROR',
          'Failed to find user by email',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * ユーザーの保存（新規作成）
   */
  async save(user: User): Promise<Result<void>> {
    try {
      this.logger.debug({ userId: user.id.value }, 'Saving new user');

      // Supabase Authでユーザーを作成
      const result = await this.authAdapter.createUser({
        id: user.id.value,
        email: user.email.value,
        email_confirmed: user.emailVerified,
        app_metadata: {
          tier: user.tier.level.toLowerCase(), // Supabaseには小文字で保存（例: 'tier1'）
        },
        user_metadata: user.metadata || {},
      });

      if (!result) {
        return Result.fail(
          new DomainError(
            'USER_CREATION_FAILED',
            'Failed to create user in Supabase',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.info({ userId: user.id.value }, 'User saved successfully');
      return Result.ok();
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id.value,
        },
        'Error saving user',
      );

      return Result.fail(
        new DomainError('USER_REPOSITORY_ERROR', 'Failed to save user', ErrorType.INTERNAL),
      );
    }
  }

  /**
   * ユーザーの更新
   */
  async update(user: User): Promise<Result<void>> {
    try {
      this.logger.debug({ userId: user.id.value }, 'Updating user');

      // Supabase Authでユーザーを更新
      const result = await this.authAdapter.updateUser(user.id.value, {
        email: user.email.value,
        email_confirmed: user.emailVerified,
        app_metadata: {
          tier: user.tier.level.toLowerCase(), // Supabaseには小文字で保存（例: 'tier1'）
        },
        user_metadata: user.metadata || {},
      });

      if (!result) {
        return Result.fail(
          new DomainError(
            'USER_UPDATE_FAILED',
            'Failed to update user in Supabase',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.info({ userId: user.id.value }, 'User updated successfully');
      return Result.ok();
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id.value,
        },
        'Error updating user',
      );

      return Result.fail(
        new DomainError('USER_REPOSITORY_ERROR', 'Failed to update user', ErrorType.INTERNAL),
      );
    }
  }

  /**
   * ユーザーの削除
   */
  async delete(id: UserId): Promise<Result<void>> {
    try {
      this.logger.debug({ userId: id.value }, 'Deleting user');

      // Supabase Authからユーザーを削除
      const result = await this.authAdapter.deleteUser(id.value);

      if (!result) {
        return Result.fail(
          new DomainError(
            'USER_DELETION_FAILED',
            'Failed to delete user from Supabase',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.info({ userId: id.value }, 'User deleted successfully');
      return Result.ok();
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: id.value,
        },
        'Error deleting user',
      );

      return Result.fail(
        new DomainError('USER_REPOSITORY_ERROR', 'Failed to delete user', ErrorType.INTERNAL),
      );
    }
  }

  /**
   * SupabaseユーザーからドメインUserへのマッピング
   */
  private async mapToDomainUser(supabaseUser: any): Promise<User | null> {
    try {
      this.logger.debug(
        {
          supabaseUser,
        },
        'Mapping Supabase user to domain model',
      );

      // UserIdの作成
      const userIdResult = UserId.create(supabaseUser.id);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            userId: supabaseUser.id,
            error: userIdResult.getError().message,
          },
          'Invalid user ID format',
        );
        return null;
      }
      const userId = userIdResult.getValue();

      // Emailの作成
      const emailResult = Email.create(supabaseUser.email || '');
      if (emailResult.isFailure) {
        this.logger.error(
          {
            email: supabaseUser.email,
            error: emailResult.getError().message,
          },
          'Invalid email format',
        );
        return null;
      }
      const email = emailResult.getValue();

      // UserTierの作成
      // Supabaseから取得したtier値を正規化（例: 'tier1' -> 'TIER1'）
      const rawTier = supabaseUser.app_metadata?.tier || 'tier1';
      const tierLevel = rawTier.toUpperCase() as TierLevel;
      const tierResult = UserTier.create(tierLevel);
      if (tierResult.isFailure) {
        this.logger.error(
          {
            tier: tierLevel,
            rawTier: rawTier,
            error: tierResult.getError().message,
          },
          'Invalid tier level',
        );
        return null;
      }
      const tier = tierResult.getValue();

      // ユーザーエンティティの再構築
      const userProps: UserProps & { id: UserId } = {
        id: userId,
        email: email,
        tier: tier,
        createdAt: new Date(supabaseUser.created_at),
        updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
        lastAuthenticatedAt: supabaseUser.last_sign_in_at
          ? new Date(supabaseUser.last_sign_in_at)
          : undefined,
        emailVerified: supabaseUser.email_confirmed_at !== null,
        metadata: supabaseUser.user_metadata || {},
      };

      return User.reconstruct(userProps);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: supabaseUser?.id,
        },
        'Failed to map Supabase user to domain model',
      );
      return null;
    }
  }
}
