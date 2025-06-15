import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { OpenDataResource } from '../entities/open-data-resource';
import { DataPath } from '../value-objects/data-path';
import { ResourceId } from '../value-objects/resource-id';

/**
 * オープンデータリポジトリのインターフェース
 * データリソースの永続化と取得を管理
 */
export interface IOpenDataRepository {
  /**
   * パスからデータリソースを検索
   * @param path データパス
   */
  findByPath(path: DataPath): Promise<Result<OpenDataResource, DomainError>>;

  /**
   * IDからデータリソースを検索
   * @param id リソースID
   */
  findById(id: ResourceId): Promise<Result<OpenDataResource, DomainError>>;

  /**
   * データリソースのコンテンツを取得
   * @param resource データリソース
   */
  getContent(resource: OpenDataResource): Promise<Result<any, DomainError>>;

  /**
   * ディレクトリ内のリソースをリスト
   * @param directoryPath ディレクトリパス
   */
  listByDirectory(directoryPath: string): Promise<Result<OpenDataResource[], DomainError>>;

  /**
   * リソースの存在確認
   * @param path データパス
   */
  exists(path: DataPath): Promise<boolean>;

  /**
   * リソースのメタデータを更新
   * @param resource 更新するリソース
   */
  updateMetadata(resource: OpenDataResource): Promise<Result<void, DomainError>>;

  /**
   * キャッシュされたリソースを取得
   * @param path データパス
   */
  getCached(path: DataPath): Promise<OpenDataResource | null>;

  /**
   * リソースをキャッシュに保存
   * @param resource リソース
   * @param content コンテンツ
   */
  cache(resource: OpenDataResource, content: any): Promise<void>;

  /**
   * キャッシュをクリア
   * @param path 特定のパス（指定しない場合は全クリア）
   */
  clearCache(path?: DataPath): Promise<void>;
}