/**
 * ブランド型の実装
 * プリミティブ型に型レベルのタグを付けることで、
 * 異なるコンテキストの値を区別できるようにする
 */
declare const brand: unique symbol;

/**
 * ブランド型の定義
 * @template T - ベースとなる型
 * @template TBrand - ブランド名
 */
export type Brand<T, TBrand> = T & { [brand]: TBrand };

/**
 * 値をブランド型に変換するヘルパー関数
 * @template T - ベースとなる型
 * @template TBrand - ブランド名
 * @param value - ブランド化する値
 * @returns ブランド型の値
 */
export const toBrand = <T, TBrand>(value: T): Brand<T, TBrand> => {
  return value as Brand<T, TBrand>;
};

/**
 * ブランド型から基本型を取得するヘルパー型
 * @template B - ブランド型
 */
export type UnBrand<B> = B extends Brand<infer T, any> ? T : B;
