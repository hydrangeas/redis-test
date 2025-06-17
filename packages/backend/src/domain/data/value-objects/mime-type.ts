import { ValidationError } from '../../errors/validation-error';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';

/**
 * MIMEタイプを表すバリューオブジェクト
 * ファイルタイプの検証と判定
 */
export class MimeType {
  /**
   * 拡張子とMIMEタイプのマッピング
   */
  private static readonly EXTENSION_MAP: Record<string, string> = {
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  /**
   * MIMEタイプの検証用正規表現
   */
  private static readonly MIME_TYPE_PATTERN =
    /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_+\-.]*(\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_+\-.]*)?$/;

  private readonly _type: string;
  private readonly _subtype: string;

  /**
   * @param value - MIMEタイプ文字列
   */
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('MIME type cannot be empty');
    }

    const trimmedValue = value.trim().toLowerCase();

    const parts = trimmedValue.split('/');
    if (parts.length !== 2) {
      throw new ValidationError('MIME type must have type and subtype', {
        value,
      });
    }

    const [type, subtype] = parts;
    if (!type || !subtype) {
      throw new ValidationError('MIME type must have type and subtype', {
        value,
      });
    }

    if (!MimeType.MIME_TYPE_PATTERN.test(trimmedValue)) {
      throw new ValidationError('Invalid MIME type format', {
        value,
        pattern: 'type/subtype',
      });
    }

    this._type = type;
    this._subtype = subtype;
    Object.freeze(this);
  }

  /**
   * MIMEタイプの完全な文字列を取得
   */
  get value(): string {
    return `${this._type}/${this._subtype}`;
  }

  /**
   * メインタイプを取得
   */
  get type(): string {
    return this._type;
  }

  /**
   * サブタイプを取得
   */
  get subtype(): string {
    return this._subtype;
  }

  /**
   * 値からMIMEタイプを作成（Result型を返す）
   */
  static create(value: string): Result<MimeType> {
    try {
      return Result.ok(new MimeType(value));
    } catch (error) {
      if (error instanceof ValidationError) {
        return Result.fail(
          DomainError.validation('INVALID_MIME_TYPE', error.message, error.details),
        );
      }
      return Result.fail(
        DomainError.internal('MIME_TYPE_ERROR', 'Failed to create MimeType'),
      );
    }
  }

  /**
   * 拡張子からMIMEタイプを推測
   */
  static fromExtension(extension: string): MimeType {
    // 拡張子を正規化（小文字、ドット付き）
    let normalizedExt = extension.toLowerCase();
    if (!normalizedExt.startsWith('.')) {
      normalizedExt = '.' + normalizedExt;
    }

    const mimeType = MimeType.EXTENSION_MAP[normalizedExt];
    if (!mimeType) {
      // 不明な拡張子の場合はapplication/octet-streamを返す
      return MimeType.APPLICATION_OCTET_STREAM;
    }

    return new MimeType(mimeType);
  }

  /**
   * ファイルパスからMIMEタイプを推測
   */
  static fromFilePath(path: string): MimeType {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1 || lastDot === path.length - 1) {
      return MimeType.APPLICATION_OCTET_STREAM;
    }

    const extension = path.substring(lastDot);
    return MimeType.fromExtension(extension);
  }

  /**
   * テキストタイプかどうかを判定
   */
  isText(): boolean {
    return (
      this._type === 'text' || this.value === 'application/json' || this.value === 'application/xml'
    );
  }

  /**
   * 画像タイプかどうかを判定
   */
  isImage(): boolean {
    return this._type === 'image';
  }

  /**
   * JSONタイプかどうかを判定
   */
  isJson(): boolean {
    return this.value === 'application/json' || this._subtype.endsWith('+json');
  }

  /**
   * バイナリタイプかどうかを判定
   */
  isBinary(): boolean {
    return !this.isText();
  }

  /**
   * 等価性の比較
   */
  equals(other: MimeType): boolean {
    return this.value === other.value;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * JSONからの復元
   */
  static fromJSON(value: string): MimeType {
    return new MimeType(value);
  }

  /**
   * 一般的なMIMEタイプの定数
   */
  static readonly APPLICATION_JSON = new MimeType('application/json');
  static readonly APPLICATION_PDF = new MimeType('application/pdf');
  static readonly APPLICATION_ZIP = new MimeType('application/zip');
  static readonly APPLICATION_OCTET_STREAM = new MimeType('application/octet-stream');
  static readonly TEXT_PLAIN = new MimeType('text/plain');
  static readonly TEXT_CSV = new MimeType('text/csv');
  static readonly TEXT_HTML = new MimeType('text/html');
  static readonly IMAGE_JPEG = new MimeType('image/jpeg');
  static readonly IMAGE_PNG = new MimeType('image/png');
  static readonly IMAGE_GIF = new MimeType('image/gif');
}
