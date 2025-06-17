import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Entity, UniqueEntityId } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';

import { UserId } from '../value-objects/user-id';

import type { Email } from '../value-objects/email';
import type { UserTier } from '../value-objects/user-tier';


export interface UserProps {
  email: Email;
  tier: UserTier;
  createdAt: Date;
  updatedAt: Date;
  lastAuthenticatedAt?: Date;
  emailVerified: boolean;
  metadata?: Record<string, any>;
}

/**
 * ユーザーエンティティ
 *
 * アプリケーションのユーザーを表現するドメインエンティティ
 */
export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityId) {
    super(props, id);
  }
  get id(): UserId {
    // UniqueEntityIdからUserIdを作成
    return UserId.create(this._id.value).getValue();
  }

  get email(): Email {
    return this.props.email;
  }

  get tier(): UserTier {
    return this.props.tier;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastAuthenticatedAt(): Date | undefined {
    return this.props.lastAuthenticatedAt;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  /**
   * ユーザーの作成
   */
  public static create(props: {
    id: UserId;
    email: Email;
    tier: UserTier;
    emailVerified?: boolean;
    metadata?: Record<string, any>;
  }): Result<User> {
    const now = new Date();

    const user = new User(
      {
        email: props.email,
        tier: props.tier,
        createdAt: now,
        updatedAt: now,
        emailVerified: props.emailVerified ?? false,
        metadata: props.metadata,
      },
      new UniqueEntityId(props.id.value),
    );

    return Result.ok(user);
  }

  /**
   * 既存データからの再構築
   */
  public static reconstruct(props: UserProps & { id: UserId }): User {
    return new User(
      {
        email: props.email,
        tier: props.tier,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
        lastAuthenticatedAt: props.lastAuthenticatedAt,
        emailVerified: props.emailVerified,
        metadata: props.metadata,
      },
      new UniqueEntityId(props.id.value),
    );
  }

  /**
   * メールアドレスの更新
   */
  public updateEmail(email: Email): Result<void> {
    if (this.props.email.equals(email)) {
      return Result.fail(
        new DomainError(
          'EMAIL_NOT_CHANGED',
          'The email address is the same as the current one',
          ErrorType.VALIDATION,
        ),
      );
    }

    this.props.email = email;
    this.props.emailVerified = false; // メール変更時は再検証が必要
    this.props.updatedAt = new Date();

    return Result.ok();
  }

  /**
   * ティアの更新
   */
  public updateTier(tier: UserTier): Result<void> {
    if (this.props.tier.equals(tier)) {
      return Result.fail(
        new DomainError(
          'TIER_NOT_CHANGED',
          'The tier is the same as the current one',
          ErrorType.VALIDATION,
        ),
      );
    }

    this.props.tier = tier;
    this.props.updatedAt = new Date();

    return Result.ok();
  }

  /**
   * メール検証済みに更新
   */
  public verifyEmail(): void {
    this.props.emailVerified = true;
    this.props.updatedAt = new Date();
  }

  /**
   * 最終認証日時の更新
   */
  public updateLastAuthenticatedAt(): void {
    this.props.lastAuthenticatedAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * メタデータの更新
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata };
    this.props.updatedAt = new Date();
  }

  // equals メソッドは基底クラスのEntity から継承される
}
