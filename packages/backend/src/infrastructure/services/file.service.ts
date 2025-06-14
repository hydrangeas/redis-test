import { injectable } from 'tsyringe';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { InjectAppConfig, InjectLogger } from '../di/decorators.js';
import type { Logger } from 'pino';

export interface IFileService {
  readFile(path: string): Promise<Buffer>;
  exists(path: string): Promise<boolean>;
  getFilePath(relativePath: string): string;
}

@injectable()
export class FileService implements IFileService {
  constructor(
    @InjectAppConfig() private readonly config: { dataPath: string },
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async readFile(path: string): Promise<Buffer> {
    try {
      const data = await readFile(path);
      return data;
    } catch (error) {
      this.logger.error({ error, path }, 'Failed to read file');
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  getFilePath(relativePath: string): string {
    // Remove leading slash if present
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return join(this.config.dataPath, cleanPath);
  }
}