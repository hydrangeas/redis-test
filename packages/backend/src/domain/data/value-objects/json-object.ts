import { DomainError } from '@/domain/errors/domain-error';
import { Result } from '@/domain/shared/result';
import { ValueObject } from '@/domain/shared/value-object';

// JSON値の型定義
export type JsonValue = string | number | boolean | null | JsonObjectType | JsonArray;
export type JsonObjectType = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export interface JsonObjectProps {
  value: JsonObjectType;
}

/**
 * JSONオブジェクトを型安全に扱うためのバリューオブジェクト
 */
export class JsonObject extends ValueObject<JsonObjectProps> {
  get value(): JsonObjectType {
    return { ...this.props.value }; // Return a copy to maintain immutability
  }

  /**
   * 指定されたパスの値を取得
   * @param path ドット記法のパス (例: "user.name")
   */
  get<T = JsonValue>(path: string): T | undefined {
    const keys = path.split('.');
    let current: unknown = this.props.value;

    for (const key of keys) {
      if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  /**
   * 指定されたパスの値を取得（デフォルト値付き）
   */
  getOrDefault<T = JsonValue>(path: string, defaultValue: T): T {
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
  set(path: string, value: JsonValue): Result<JsonObject> {
    const keys = path.split('.');
    const newValue = { ...this.props.value };
    let current: JsonObjectType = newValue;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const currentValue = current[key];
      if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
        current[key] = {};
      } else {
        current[key] = { ...currentValue };
      }
      current = current[key] as JsonObjectType;
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
    let current: JsonObjectType = newValue;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const currentValue = current[key];
      if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
        return JsonObject.create(newValue); // Path doesn't exist, return as is
      }
      current[key] = { ...currentValue };
      current = current[key] as JsonObjectType;
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
  private deepMerge(target: JsonObjectType, source: JsonObjectType): JsonObjectType {
    const result: JsonObjectType = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        
        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
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
  values(): JsonValue[] {
    return Object.values(this.props.value);
  }

  /**
   * エントリーの配列を取得
   */
  entries(): [string, JsonValue][] {
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
  static create(value: unknown): Result<JsonObject> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return Result.fail(DomainError.validation('INVALID_JSON_OBJECT', 'Value must be a valid object'));
    }

    if (!this.isValidJsonObject(value)) {
      return Result.fail(DomainError.validation('INVALID_JSON_OBJECT', 'Value must be a valid JSON object'));
    }

    return Result.ok(new JsonObject({ value }));
  }

  /**
   * JSON値として有効かチェックする型ガード
   */
  private static isValidJsonValue(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.every(item => this.isValidJsonValue(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every(val => this.isValidJsonValue(val));
    }
    return false;
  }

  /**
   * JSONオブジェクトとして有効かチェックする型ガード
   */
  private static isValidJsonObject(value: unknown): value is JsonObjectType {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    return Object.values(value).every(val => this.isValidJsonValue(val));
  }

  /**
   * JSON文字列から作成
   */
  static fromJsonString(jsonString: string): Result<JsonObject> {
    try {
      const parsed = JSON.parse(jsonString) as unknown;
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
