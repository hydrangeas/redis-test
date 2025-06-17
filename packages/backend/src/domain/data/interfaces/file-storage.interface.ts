import type { Result } from '@/domain/errors/result';

/**
 * File storage interface for data persistence
 * Provides abstraction over file system operations
 */
export interface IFileStorage {
  /**
   * Read file content from storage
   * @param path - Relative path to the file
   * @returns Parsed JSON content or error
   */
  readFile(path: string): Promise<Result<any>>;

  /**
   * Get file metadata without reading content
   * @param path - Relative path to the file
   * @returns File metadata or error
   */
  getFileMetadata(path: string): Promise<Result<FileMetadata>>;

  /**
   * Stream file content for large files
   * @param path - Relative path to the file
   * @param options - Optional byte range for partial content
   * @returns Readable stream or error
   */
  streamFile(
    path: string,
    options?: { start?: number; end?: number },
  ): Promise<Result<NodeJS.ReadableStream>>;

  /**
   * List files in a directory
   * @param directory - Relative path to directory
   * @returns Array of file paths or error
   */
  listFiles(directory: string): Promise<Result<string[]>>;

  /**
   * Check if file exists
   * @param path - Relative path to the file
   * @returns True if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Clean up resources (close watchers, clear cache, etc.)
   */
  cleanup(): Promise<void>;
}

/**
 * File metadata information
 */
export interface FileMetadata {
  /** Relative file path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Last modification time */
  mtime: Date;
  /** ETag for caching */
  etag: string;
  /** MIME type */
  contentType?: string;
}
