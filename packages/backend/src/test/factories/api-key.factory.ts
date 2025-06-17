import { createHash } from 'crypto';

import { faker } from '@faker-js/faker/locale/ja';

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class ApiKeyFactory {
  static generateRawKey(): string {
    const prefix = 'nara_';
    const randomPart = faker.string.alphanumeric(32);
    return `${prefix}${randomPart}`;
  }

  static hashKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  static create(userId: string, overrides?: Partial<ApiKey>): ApiKey & { raw_key?: string } {
    const rawKey = this.generateRawKey();

    return {
      id: faker.string.uuid(),
      user_id: userId,
      key_hash: this.hashKey(rawKey),
      key_prefix: rawKey.substring(0, 8),
      last_used_at: faker.datatype.boolean() ? faker.date.recent({ days: 7 }) : null,
      created_at: faker.date.past({ years: 1 }),
      updated_at: faker.date.recent(),
      raw_key: rawKey, // テスト用に生のキーも返す
      ...overrides,
    };
  }

  static createMany(
    userId: string,
    count: number,
    overrides?: Partial<ApiKey>,
  ): Array<ApiKey & { raw_key?: string }> {
    return Array.from({ length: count }, () => this.create(userId, overrides));
  }

  static createExpired(userId: string, overrides?: Partial<ApiKey>): ApiKey & { raw_key?: string } {
    return this.create(userId, {
      last_used_at: faker.date.past({ years: 2 }),
      ...overrides,
    });
  }

  static createNeverUsed(
    userId: string,
    overrides?: Partial<ApiKey>,
  ): ApiKey & { raw_key?: string } {
    return this.create(userId, {
      last_used_at: null,
      ...overrides,
    });
  }
}
