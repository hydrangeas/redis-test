import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

/**
 * User-Agent情報を表すバリューオブジェクト
 */
export class UserAgent {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * User-Agentの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * User-Agentを作成
   */
  static create(value: string): Result<UserAgent> {
    if (!value || value.trim().length === 0) {
      return Result.fail<UserAgent>(
        new DomainError('EMPTY_USER_AGENT', 'User-Agentは空にできません', ErrorType.VALIDATION)
      );
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length > 500) {
      return Result.fail<UserAgent>(
        new DomainError('USER_AGENT_TOO_LONG', 'User-Agentは500文字以内である必要があります', ErrorType.VALIDATION)
      );
    }

    return Result.ok(new UserAgent(trimmedValue));
  }

  /**
   * 不明なUser-Agentを作成
   */
  static unknown(): Result<UserAgent> {
    return Result.ok(new UserAgent('Unknown'));
  }

  /**
   * User-Agentを解析して基本情報を取得
   */
  parse(): UserAgentInfo {
    const value = this._value.toLowerCase();

    // ブラウザの検出
    let browser = 'Unknown';
    let browserVersion = '';

    if (value.includes('chrome/')) {
      browser = 'Chrome';
      const match = value.match(/chrome\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (value.includes('firefox/')) {
      browser = 'Firefox';
      const match = value.match(/firefox\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (value.includes('safari/') && !value.includes('chrome')) {
      browser = 'Safari';
      const match = value.match(/version\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (value.includes('edge/')) {
      browser = 'Edge';
      const match = value.match(/edge\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    }

    // OSの検出
    let os = 'Unknown';
    let osVersion = '';

    if (value.includes('windows nt')) {
      os = 'Windows';
      const match = value.match(/windows nt (\d+\.\d+)/);
      if (match) {
        const ntVersion = match[1];
        osVersion = this.getWindowsVersion(ntVersion);
      }
    } else if (value.includes('mac os x')) {
      os = 'macOS';
      const match = value.match(/mac os x (\d+[._]\d+)/);
      if (match) osVersion = match[1].replace('_', '.');
    } else if (value.includes('linux')) {
      os = 'Linux';
    } else if (value.includes('android')) {
      os = 'Android';
      const match = value.match(/android (\d+\.\d+)/);
      if (match) osVersion = match[1];
    } else if (value.includes('iphone') || value.includes('ipad')) {
      os = 'iOS';
      const match = value.match(/os (\d+[._]\d+)/);
      if (match) osVersion = match[1].replace('_', '.');
    }

    // デバイスタイプの検出
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';

    if (value.includes('mobile') || value.includes('android') || value.includes('iphone')) {
      deviceType = 'mobile';
    } else if (value.includes('tablet') || value.includes('ipad')) {
      deviceType = 'tablet';
    } else if (browser !== 'Unknown' && (os === 'Windows' || os === 'macOS' || os === 'Linux')) {
      deviceType = 'desktop';
    }

    // ボットの検出
    const isBot = this.isBot();

    return {
      browser,
      browserVersion,
      os,
      osVersion,
      deviceType,
      isBot,
      raw: this._value,
    };
  }

  /**
   * WindowsのNTバージョンから実際のバージョンを取得
   */
  private getWindowsVersion(ntVersion: string): string {
    const versionMap: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP',
    };
    return versionMap[ntVersion] || ntVersion;
  }

  /**
   * ボットかどうかを判定
   */
  isBot(): boolean {
    const botPatterns = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python',
      'java',
      'ruby',
      'go-http-client',
      'postman',
    ];

    const lowerValue = this._value.toLowerCase();
    return botPatterns.some((pattern) => lowerValue.includes(pattern));
  }

  /**
   * クローラーかどうかを判定
   */
  isCrawler(): boolean {
    const crawlerPatterns = [
      'crawler',
      'spider',
      'googlebot',
      'bingbot',
      'yandexbot',
      'facebookexternalhit',
      'twitterbot',
      'linkedinbot',
      'slackbot',
    ];

    const lowerValue = this._value.toLowerCase();
    return crawlerPatterns.some((pattern) => lowerValue.includes(pattern));
  }

  /**
   * 等価性の比較
   */
  equals(other: UserAgent): boolean {
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

/**
 * User-Agent解析結果
 */
export interface UserAgentInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  isBot: boolean;
  raw: string;
}
