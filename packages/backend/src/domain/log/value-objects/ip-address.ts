import { Result } from '@/domain/errors';

/**
 * IPアドレスを表すバリューオブジェクト
 */
export class IPAddress {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * IPアドレスの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * IPアドレスを作成
   */
  static create(value: string): Result<IPAddress> {
    if (!value || value.trim().length === 0) {
      return Result.fail<IPAddress>('IPアドレスは空にできません');
    }

    const trimmedValue = value.trim();

    // IPv4またはIPv6の検証
    if (!this.isValidIPv4(trimmedValue) && !this.isValidIPv6(trimmedValue)) {
      return Result.fail<IPAddress>('無効なIPアドレス形式です');
    }

    return Result.ok(new IPAddress(trimmedValue));
  }

  /**
   * 不明なIPアドレスを作成
   */
  static unknown(): Result<IPAddress> {
    return Result.ok(new IPAddress('0.0.0.0'));
  }

  /**
   * IPv4形式の検証
   */
  private static isValidIPv4(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * IPv6形式の検証
   */
  private static isValidIPv6(ip: string): boolean {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
  }

  /**
   * IPアドレスが有効かどうかを判定
   */
  isValid(): boolean {
    return IPAddress.isValidIPv4(this._value) || IPAddress.isValidIPv6(this._value);
  }

  /**
   * IPv4アドレスかどうかを判定
   */
  isIPv4(): boolean {
    return IPAddress.isValidIPv4(this._value);
  }

  /**
   * IPv6アドレスかどうかを判定
   */
  isIPv6(): boolean {
    return IPAddress.isValidIPv6(this._value);
  }

  /**
   * IPアドレスを匿名化（最後のオクテット/セグメントを0に置換）
   */
  anonymize(): IPAddress {
    if (this.isIPv4()) {
      const parts = this._value.split('.');
      parts[3] = '0';
      return new IPAddress(parts.join('.'));
    }

    if (this.isIPv6()) {
      // 簡略化: 最後のセグメントを0に
      const parts = this._value.split(':');
      if (parts.length > 0) {
        parts[parts.length - 1] = '0';
      }
      return new IPAddress(parts.join(':'));
    }

    return this;
  }

  /**
   * プライベートIPアドレスかどうかを判定
   */
  isPrivate(): boolean {
    if (this.isIPv4()) {
      const parts = this._value.split('.').map(Number);
      // 10.0.0.0/8
      if (parts[0] === 10) return true;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return true;
      // 127.0.0.0/8 (loopback)
      if (parts[0] === 127) return true;
    }

    if (this.isIPv6()) {
      // ::1 (loopback)
      if (this._value === '::1') return true;
      // fc00::/7 (unique local)
      if (this._value.startsWith('fc') || this._value.startsWith('fd')) return true;
      // fe80::/10 (link local)
      if (this._value.startsWith('fe80')) return true;
    }

    return false;
  }

  /**
   * ブラックリストに登録されているかどうかを判定
   * (実装では簡易的にfalseを返す。実際の実装ではブラックリストDBとの連携が必要)
   */
  isBlacklisted(): boolean {
    // TODO: 実際の実装ではブラックリストDBや外部サービスとの連携が必要
    return false;
  }

  /**
   * 等価性の比較
   */
  equals(other: IPAddress): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON表現を返す
   */
  toJSON(): string {
    return this._value;
  }
}