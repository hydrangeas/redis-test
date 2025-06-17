import type { DomainError } from './domain-error';

/**
 * Result型パターンの実装
 * エラーを値として扱い、例外を投げない関数型アプローチ
 */
export class Result<T> {
  private constructor(
    private readonly value: T | null,
    private readonly error: DomainError | null,
    public readonly isSuccess: boolean,
  ) {}

  /**
   * 成功結果を作成
   */
  static ok<T>(value: T): Result<T> {
    return new Result(value, null, true);
  }

  /**
   * 失敗結果を作成
   */
  static fail<T>(error: DomainError): Result<T> {
    return new Result<T>(null, error, false);
  }

  /**
   * 複数の結果を結合
   */
  static combine(results: Result<any>[]): Result<any> {
    for (const result of results) {
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok(results);
  }

  /**
   * 値を取得（失敗時は例外をthrow）
   */
  getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get value from failed result');
    }
    return this.value!;
  }

  /**
   * エラーを取得（成功時は例外をthrow）
   */
  getError(): DomainError {
    if (this.isSuccess) {
      throw new Error('Cannot get error from successful result');
    }
    return this.error!;
  }

  /**
   * 失敗フラグ
   */
  get isFailure(): boolean {
    return !this.isSuccess;
  }

  /**
   * 結果のマッピング
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isSuccess) {
      return Result.ok(fn(this.value!));
    }
    return Result.fail<U>(this.error!);
  }

  /**
   * 結果のフラットマッピング
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isSuccess) {
      return fn(this.value!);
    }
    return Result.fail<U>(this.error!);
  }

  /**
   * エラーハンドリング
   */
  mapError(fn: (error: DomainError) => DomainError): Result<T> {
    if (this.isFailure) {
      return Result.fail<T>(fn(this.error!));
    }
    return this;
  }

  /**
   * 値またはデフォルト値を取得
   */
  getOrElse(defaultValue: T): T {
    return this.isSuccess ? this.value! : defaultValue;
  }

  /**
   * 値またはエラー処理の結果を取得
   */
  getOrElseThrow(errorFn: (error: DomainError) => Error): T {
    if (this.isSuccess) {
      return this.value!;
    }
    throw errorFn(this.error!);
  }
}

/**
 * Either型のエイリアス（慣用的な名前）
 */
export type Either<_L, R> = Result<R>;
