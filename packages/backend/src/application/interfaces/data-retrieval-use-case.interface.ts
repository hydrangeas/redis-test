import type { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import type { Result } from '@/domain/shared/result';

/**
 * データ取得ユースケースのインターフェース
 * オープンデータAPIのデータ取得機能を提供
 */
export interface IDataRetrievalUseCase {
  /**
   * 指定されたパスのデータを取得
   * @param path データパス（例: "secure/319985/r5.json"）
   * @param user 認証済みユーザー
   * @returns データ内容とメタデータ
   */
  retrieveData(
    path: string,
    user: AuthenticatedUser,
  ): Promise<
    Result<{
      content: unknown;
      checksum: string;
      lastModified: Date;
    }>
  >;

  /**
   * 指定されたパスのデータメタデータを取得
   * @param path データパス
   * @returns データのメタデータ（サイズ、更新日時、ETag等）
   */
  retrieveMetadata(path: string): Promise<
    Result<{
      size: number;
      lastModified: Date;
      etag: string;
      contentType: string;
    }>
  >;

  /**
   * 条件付きデータ取得（ETagベース）
   * @param path データパス
   * @param etag クライアントが持つETag
   * @returns データ内容またはNot Modified
   */
  retrieveDataWithETag(
    path: string,
    etag: string,
  ): Promise<
    Result<{
      data?: unknown;
      notModified: boolean;
      newEtag?: string;
    }>
  >;

  /**
   * 条件付きデータ取得（Last-Modifiedベース）
   * @param path データパス
   * @param ifModifiedSince クライアントが持つ最終更新日時
   * @returns データ内容またはNot Modified
   */
  retrieveDataIfModified(
    path: string,
    ifModifiedSince: Date,
  ): Promise<
    Result<{
      data?: unknown;
      notModified: boolean;
      lastModified?: Date;
    }>
  >;
}
