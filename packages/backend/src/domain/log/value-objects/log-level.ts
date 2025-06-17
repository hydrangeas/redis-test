import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

/**
 * ログレベルを表すバリューオブジェクト
 * ログの重要度を階層的に表現する
 */
export class LogLevel {
  private static readonly LEVELS = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
  } as const;

  private constructor(
    private readonly _level: keyof typeof LogLevel.LEVELS,
    private readonly _value: number,
  ) {
    Object.freeze(this);
  }

  /**
   * 事前定義されたログレベル
   */
  static readonly DEBUG = new LogLevel('DEBUG', LogLevel.LEVELS.DEBUG);
  static readonly INFO = new LogLevel('INFO', LogLevel.LEVELS.INFO);
  static readonly WARN = new LogLevel('WARN', LogLevel.LEVELS.WARN);
  static readonly ERROR = new LogLevel('ERROR', LogLevel.LEVELS.ERROR);

  /**
   * ログレベルの名前を取得
   */
  get level(): string {
    return this._level;
  }

  /**
   * ログレベルの数値を取得
   */
  get value(): number {
    return this._value;
  }

  /**
   * 文字列からログレベルを作成
   */
  static fromString(level: string): Result<LogLevel> {
    const upperLevel = level.toUpperCase();

    switch (upperLevel) {
      case 'DEBUG':
        return Result.ok(LogLevel.DEBUG);
      case 'INFO':
        return Result.ok(LogLevel.INFO);
      case 'WARN':
        return Result.ok(LogLevel.WARN);
      case 'ERROR':
        return Result.ok(LogLevel.ERROR);
      default:
        return Result.fail<LogLevel>(new DomainError('INVALID_LOG_LEVEL', `無効なログレベル: ${level}`, ErrorType.VALIDATION));
    }
  }

  /**
   * 他のログレベルより低いかどうかを判定
   */
  isLowerThan(other: LogLevel): boolean {
    return this._value < other._value;
  }

  /**
   * 他のログレベルより高いかどうかを判定
   */
  isHigherThan(other: LogLevel): boolean {
    return this._value > other._value;
  }

  /**
   * 指定された最小レベルを満たしているかを判定
   */
  meetsMinimumLevel(minLevel: LogLevel): boolean {
    return this._value >= minLevel._value;
  }

  /**
   * 等価性の比較
   */
  equals(other: LogLevel): boolean {
    if (!other) return false;
    return this._level === other._level && this._value === other._value;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._level;
  }

  /**
   * JSON表現を返す
   */
  toJSON(): string {
    return this._level;
  }
}
