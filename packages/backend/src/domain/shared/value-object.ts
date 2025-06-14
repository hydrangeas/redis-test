/**
 * 基底バリューオブジェクトクラス
 * ドメイン駆動設計のバリューオブジェクトパターンを実装
 * 
 * バリューオブジェクトの特徴:
 * - 不変性（immutable）
 * - 値による等価性判定
 * - 自己完結的なバリデーション
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * 値の等価性を判定
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * ハッシュコードを生成（等価性判定の補助）
   */
  public hashCode(): string {
    return JSON.stringify(this.props);
  }
}