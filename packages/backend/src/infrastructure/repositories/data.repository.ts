import { injectable } from 'tsyringe';
import { InjectFileService, InjectLogger } from '../di/decorators.js';
import type { IFileService } from '../services/file.service.js';
import type { Logger } from 'pino';

export interface IDataRepository {
  getJsonData(path: string): Promise<any | null>;
  exists(path: string): Promise<boolean>;
}

@injectable()
export class DataRepository implements IDataRepository {
  constructor(
    @InjectFileService() private readonly fileService: IFileService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async getJsonData(path: string): Promise<any | null> {
    try {
      const filePath = this.fileService.getFilePath(path);
      const exists = await this.fileService.exists(filePath);
      
      if (!exists) {
        this.logger.debug({ path, filePath }, 'File not found');
        return null;
      }

      const data = await this.fileService.readFile(filePath);
      return JSON.parse(data.toString('utf-8'));
    } catch (error) {
      this.logger.error({ error, path }, 'Failed to get JSON data');
      return null;
    }
  }

  async exists(path: string): Promise<boolean> {
    const filePath = this.fileService.getFilePath(path);
    return this.fileService.exists(filePath);
  }
}