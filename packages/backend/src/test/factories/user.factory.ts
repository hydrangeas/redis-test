import { faker } from '@faker-js/faker/locale/ja';

import type { User } from '@supabase/supabase-js';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      aud: 'authenticated',
      role: 'authenticated',
      email: faker.internet.email(),
      email_confirmed_at: faker.date.past().toISOString(),
      phone: faker.phone.number(),
      confirmed_at: faker.date.past().toISOString(),
      last_sign_in_at: faker.date.recent().toISOString(),
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        tier: faker.helpers.arrayElement(['tier1', 'tier2', 'tier3']),
      },
      user_metadata: {
        name: faker.person.fullName(),
      },
      identities: [],
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides,
    } as User;
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createTier1User(overrides?: Partial<User>): User {
    return this.create({
      email: 'tier1@example.com',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        tier: 'tier1',
      },
      user_metadata: {
        name: 'Tier1 Test User',
      },
      ...overrides,
    });
  }

  static createTier2User(overrides?: Partial<User>): User {
    return this.create({
      email: 'tier2@example.com',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        tier: 'tier2',
      },
      user_metadata: {
        name: 'Tier2 Test User',
      },
      ...overrides,
    });
  }

  static createTier3User(overrides?: Partial<User>): User {
    return this.create({
      email: 'tier3@example.com',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        tier: 'tier3',
      },
      user_metadata: {
        name: 'Tier3 Test User',
      },
      ...overrides,
    });
  }
}
