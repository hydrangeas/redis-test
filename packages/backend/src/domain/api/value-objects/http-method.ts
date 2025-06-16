/**
 * HTTPメソッドの列挙型
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * HTTPメソッドが有効かどうかを検証
 */
export function isValidHttpMethod(value: string): value is HttpMethod {
  return Object.values(HttpMethod).includes(value as HttpMethod);
}

/**
 * 文字列からHttpMethodへの変換
 */
export function parseHttpMethod(value: string): HttpMethod {
  const upperValue = value.toUpperCase();
  if (!isValidHttpMethod(upperValue)) {
    throw new Error(`Invalid HTTP method: ${value}`);
  }
  return upperValue as HttpMethod;
}

/**
 * HTTPメソッドが安全かどうかを判定
 * 安全なメソッドは冪等で副作用がない
 */
export function isSafeMethod(method: HttpMethod): boolean {
  return method === HttpMethod.GET || method === HttpMethod.HEAD || method === HttpMethod.OPTIONS;
}

/**
 * HTTPメソッドが冪等かどうかを判定
 * 冪等なメソッドは何度実行しても同じ結果になる
 */
export function isIdempotentMethod(method: HttpMethod): boolean {
  return isSafeMethod(method) || method === HttpMethod.PUT || method === HttpMethod.DELETE;
}
