import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

interface EmailProps {
  value: string;
}

/**
 * メールアドレスバリューオブジェクト
 */
export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9]+([._+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-]?[a-zA-Z0-9]+)*(\.[a-zA-Z]{2,})+$/;
  private static readonly MAX_LENGTH = 255;

  get value(): string {
    return this.props.value;
  }

  /**
   * メールアドレスの作成
   */
  public static create(email: string): Result<Email> {
    // null/undefined チェック
    if (email === null || email === undefined) {
      return Result.fail(
        new DomainError(
          'EMAIL_REQUIRED',
          'Email is required',
          ErrorType.VALIDATION
        )
      );
    }

    // 文字列型チェック
    if (typeof email !== 'string') {
      return Result.fail(
        new DomainError(
          'EMAIL_INVALID_TYPE',
          'Email must be a string',
          ErrorType.VALIDATION
        )
      );
    }

    // トリミング
    const trimmedEmail = email.trim();

    // 空文字チェック
    if (trimmedEmail.length === 0) {
      return Result.fail(
        new DomainError(
          'EMAIL_EMPTY',
          'Email cannot be empty',
          ErrorType.VALIDATION
        )
      );
    }

    // 長さチェック
    if (trimmedEmail.length > Email.MAX_LENGTH) {
      return Result.fail(
        new DomainError(
          'EMAIL_TOO_LONG',
          `Email must be ${Email.MAX_LENGTH} characters or less`,
          ErrorType.VALIDATION
        )
      );
    }

    // フォーマットチェック
    if (!Email.EMAIL_REGEX.test(trimmedEmail)) {
      return Result.fail(
        new DomainError(
          'EMAIL_INVALID_FORMAT',
          'Email format is invalid',
          ErrorType.VALIDATION
        )
      );
    }

    // 小文字に正規化
    const normalizedEmail = trimmedEmail.toLowerCase();

    return Result.ok(new Email({ value: normalizedEmail }));
  }

  /**
   * ドメイン部分の取得
   */
  public getDomain(): string {
    return this.props.value.split('@')[1];
  }

  /**
   * ローカル部分の取得
   */
  public getLocalPart(): string {
    return this.props.value.split('@')[0];
  }

  /**
   * 文字列表現
   */
  public toString(): string {
    return this.props.value;
  }
}