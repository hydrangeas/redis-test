/**
 * 認証結果を表す列挙型
 */
export enum AuthResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  EXPIRED = 'EXPIRED',
}

/**
 * 認証結果のヘルパー関数
 */
export const AuthResultHelper = {
  /**
   * 文字列から認証結果を取得
   */
  fromString(value: string): AuthResult | undefined {
    const upperValue = value.toUpperCase();
    if (Object.values(AuthResult).includes(upperValue as AuthResult)) {
      return upperValue as AuthResult;
    }
    return undefined;
  },

  /**
   * 成功した認証結果かどうかを判定
   */
  isSuccess(result: AuthResult): boolean {
    return result === AuthResult.SUCCESS;
  },

  /**
   * 失敗した認証結果かどうかを判定
   */
  isFailure(result: AuthResult): boolean {
    return result === AuthResult.FAILURE || result === AuthResult.EXPIRED;
  },
};