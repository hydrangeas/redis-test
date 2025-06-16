import { ValidationError } from '../../errors/validation-error';

/**
 * コンテンツタイプを表すバリューオブジェクト
 * MIMEタイプを正規化して保持
 */
export class ContentType {
  /**
   * MIMEタイプの検証用正規表現
   * type/subtype形式（オプションでパラメータ付き）
   */
  private static readonly MIME_TYPE_PATTERN =
    /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_+-.]*(\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_+-.]*)?(\s*;\s*[a-zA-Z0-9_-]+=[a-zA-Z0-9_.-]+)*$/;

  private readonly _value: string;
  private readonly _type: string;
  private readonly _subtype: string;
  private readonly _parameters: Map<string, string>;

  /**
   * @param value - MIMEタイプ文字列
   */
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('Content type cannot be empty');
    }

    const trimmedValue = value.trim().toLowerCase();

    // MIMEタイプとパラメータを分離
    const [mimeType, ...paramParts] = trimmedValue.split(';').map((s) => s.trim());

    // スラッシュが含まれているかチェック
    if (!mimeType.includes('/')) {
      throw new ValidationError('Invalid content type format', {
        value,
        pattern: 'type/subtype',
      });
    }

    const parts = mimeType.split('/');
    if (parts.length !== 2) {
      throw new ValidationError('Invalid content type format', {
        value,
        pattern: 'type/subtype',
      });
    }

    const [type, subtype] = parts;

    if (!type || !subtype) {
      throw new ValidationError('Content type must have type and subtype', {
        value,
      });
    }

    if (!ContentType.MIME_TYPE_PATTERN.test(trimmedValue)) {
      throw new ValidationError('Invalid content type format', {
        value,
        pattern: 'type/subtype',
      });
    }

    this._type = type;
    this._subtype = subtype;
    this._parameters = new Map();

    // パラメータの解析
    for (const paramPart of paramParts) {
      const [key, val] = paramPart.split('=').map((s) => s.trim());
      if (key && val) {
        this._parameters.set(key, val);
      }
    }

    // 正規化された値を再構築
    let normalizedValue = `${type}/${subtype}`;
    for (const [key, val] of this._parameters) {
      normalizedValue += `; ${key}=${val}`;
    }
    this._value = normalizedValue;

    Object.freeze(this);
    Object.freeze(this._parameters);
  }

  /**
   * 正規化された値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * メインタイプを取得（例：application）
   */
  get type(): string {
    return this._type;
  }

  /**
   * サブタイプを取得（例：json）
   */
  get subtype(): string {
    return this._subtype;
  }

  /**
   * パラメータを取得
   */
  getParameter(key: string): string | undefined {
    return this._parameters.get(key.toLowerCase());
  }

  /**
   * 文字セットを取得
   */
  getCharset(): string | undefined {
    return this.getParameter('charset');
  }

  /**
   * JSONタイプかどうかを判定
   */
  isJson(): boolean {
    return (
      this._subtype === 'json' ||
      this._subtype.endsWith('+json') ||
      (this._type === 'application' && this._subtype === 'json')
    );
  }

  /**
   * テキストタイプかどうかを判定
   */
  isText(): boolean {
    return this._type === 'text' || this.isJson();
  }

  /**
   * バイナリタイプかどうかを判定
   */
  isBinary(): boolean {
    return !this.isText();
  }

  /**
   * 等価性の比較（パラメータを無視）
   */
  equals(other: ContentType): boolean {
    return this._type === other._type && this._subtype === other._subtype;
  }

  /**
   * 等価性の比較（パラメータを含む）
   */
  equalsWithParameters(other: ContentType): boolean {
    if (!this.equals(other)) {
      return false;
    }

    if (this._parameters.size !== other._parameters.size) {
      return false;
    }

    for (const [key, value] of this._parameters) {
      if (other._parameters.get(key) !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    let result = `${this._type}/${this._subtype}`;

    for (const [key, value] of this._parameters) {
      result += `; ${key}=${value}`;
    }

    return result;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * JSONからの復元
   */
  static fromJSON(value: string): ContentType {
    return new ContentType(value);
  }

  /**
   * 一般的なコンテンツタイプの定数
   */
  static readonly APPLICATION_JSON = new ContentType('application/json');
  static readonly APPLICATION_PROBLEM_JSON = new ContentType('application/problem+json');
  static readonly TEXT_PLAIN = new ContentType('text/plain');
  static readonly TEXT_HTML = new ContentType('text/html');
  static readonly APPLICATION_OCTET_STREAM = new ContentType('application/octet-stream');
}
