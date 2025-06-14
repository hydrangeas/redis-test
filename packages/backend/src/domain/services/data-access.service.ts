import { injectable } from 'tsyringe';
import { InjectDataRepository, InjectLogger } from '../../infrastructure/di/decorators.js';
import type { IDataRepository } from '../../infrastructure/repositories/data.repository.js';
import type { Logger } from 'pino';

export interface DataAccessResult {
  found: boolean;
  data?: any;
  error?: string;
}

export interface IDataAccessService {
  getOpenData(path: string): Promise<DataAccessResult>;
  validatePath(path: string): boolean;
}

@injectable()
export class DataAccessService implements IDataAccessService {
  constructor(
    @InjectDataRepository() private readonly repository: IDataRepository,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async getOpenData(path: string): Promise<DataAccessResult> {
    try {
      // Validate path
      if (!this.validatePath(path)) {
        return {
          found: false,
          error: 'Invalid path',
        };
      }

      // Get data
      const data = await this.repository.getJsonData(path);
      
      if (data === null) {
        return {
          found: false,
          error: 'Data not found',
        };
      }

      return {
        found: true,
        data,
      };
    } catch (error) {
      this.logger.error({ error, path }, 'Failed to access data');
      return {
        found: false,
        error: 'Internal error',
      };
    }
  }

  validatePath(path: string): boolean {
    // Prevent path traversal attacks
    if (path.includes('..') || path.includes('\\')) {
      return false;
    }

    // Ensure path ends with .json
    if (!path.endsWith('.json')) {
      return false;
    }

    // Additional validation rules can be added here
    return true;
  }
}