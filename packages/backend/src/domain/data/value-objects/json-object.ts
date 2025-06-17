import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';

export interface JsonObjectProps {
  value: Record<string, any>;
}

/**
 * JSONオブジェクトを型安全に扱うためのバリューオブジェクト
 */
export class JsonObject extends ValueObject<JsonObjectProps> {
  get value(): Record<string, any> {
    return { ...this.props.value }; // Return a copy to maintain immutability
  }

  /**
   * 指定されたパスの値を取得
   * @param path ドット記法のパス (例: "user.name")
   */
  get<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.props.value;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  /**
   * 指定されたパスの値を取得（デフォルト値付き）
   */
  getOrDefault<T = any>(path: string, defaultValue: T): T {
    const value = this.get<T>(path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * 指定されたパスに値が存在するかチェック
   */
  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  /**
   * 指定されたパスに値を設定した新しいインスタンスを返す
   */
  set(path: string, value: any): Result<JsonObject> {
    const keys = path.split('.');
    const newValue = { ...this.props.value };
    let current: any = newValue;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;

    return JsonObject.create(newValue);
  }

  /**
   * 指定されたパスの値を削除した新しいインスタンスを返す
   */
  remove(path: string): Result<JsonObject> {
    const keys = path.split('.');
    const newValue = { ...this.props.value };
    let current: any = newValue;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        return JsonObject.create(newValue); // Path doesn't exist, return as is
      }
      current[key] = { ...current[key] };
      current = current[key];
    }

    delete current[keys[keys.length - 1]];

    return JsonObject.create(newValue);
  }

  /**
   * 他のJsonObjectとマージした新しいインスタンスを返す
   */
  merge(other: JsonObject): Result<JsonObject> {
    const merged = this.deepMerge(this.props.value, other.value);
    return JsonObject.create(merged);
  }

  /**
   * オブジェクトを深くマージ
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          target[key] &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key])
        ) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * JSON文字列に変換
   */
  toJsonString(pretty = false): string {
    return pretty ? JSON.stringify(this.props.value, null, 2) : JSON.stringify(this.props.value);
  }

  /**
   * キーの配列を取得
   */
  keys(): string[] {
    return Object.keys(this.props.value);
  }

  /**
   * 値の配列を取得
   */
  values(): any[] {
    return Object.values(this.props.value);
  }

  /**
   * エントリーの配列を取得
   */
  entries(): [string, any][] {
    return Object.entries(this.props.value);
  }

  /**
   * オブジェクトが空かチェック
   */
  isEmpty(): boolean {
    return Object.keys(this.props.value).length === 0;
  }

  /**
   * ファクトリメソッド
   */
  static create(value: Record<string, any>): Result<JsonObject> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return Result.fail(DomainError.validation('INVALID_JSON_OBJECT', 'Value must be a valid object'));
    }

    return Result.ok(new JsonObject({ value }));
  }

  /**
   * JSON文字列から作成
   */
  static fromJsonString(jsonString: string): Result<JsonObject> {
    try {
      const parsed = JSON.parse(jsonString);
      return JsonObject.create(parsed);
    } catch (error) {
      return Result.fail(DomainError.validation('INVALID_JSON_STRING', 'Invalid JSON string'));
    }
  }

  /**
   * 空のオブジェクトを作成
   */
  static empty(): JsonObject {
    return new JsonObject({ value: {} });
  }
}
