import { describe, it, expect } from 'vitest';
import { Provider } from '../provider';

describe('Provider', () => {
  describe('create', () => {
    it('should create Provider with valid provider name', () => {
      const validProviders = [
        'email',
        'google',
        'github',
        'microsoft',
        'apple',
        'jwt',
        'api_key',
        'anonymous',
      ];

      validProviders.forEach((provider) => {
        const result = Provider.create(provider);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(provider);
      });
    });

    it('should normalize provider name to lowercase', () => {
      const result = Provider.create('GOOGLE');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('google');
    });

    it('should trim whitespace', () => {
      const result = Provider.create('  email  ');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('email');
    });

    it('should fail with empty value', () => {
      const result = Provider.create('');

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('プロバイダー名は空にできません');
    });

    it('should fail with whitespace only', () => {
      const result = Provider.create('   ');

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('プロバイダー名は空にできません');
    });

    it('should fail with unknown provider', () => {
      const result = Provider.create('unknown');

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Unknown provider: unknown');
    });
  });

  describe('pre-defined providers', () => {
    it('should create email provider', () => {
      const provider = Provider.email();
      expect(provider.value).toBe('email');
    });

    it('should create google provider', () => {
      const provider = Provider.google();
      expect(provider.value).toBe('google');
    });

    it('should create github provider', () => {
      const provider = Provider.github();
      expect(provider.value).toBe('github');
    });

    it('should create jwt provider', () => {
      const provider = Provider.jwt();
      expect(provider.value).toBe('jwt');
    });

    it('should create anonymous provider', () => {
      const provider = Provider.anonymous();
      expect(provider.value).toBe('anonymous');
    });
  });

  describe('properties', () => {
    it('should have value property', () => {
      const provider = Provider.google();
      expect(provider.value).toBe('google');
    });

    it('should have name property for compatibility', () => {
      const provider = Provider.google();
      expect(provider.name).toBe('google');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported providers', () => {
      const provider = Provider.google();
      expect(provider.isSupported()).toBe(true);
    });
  });

  describe('isSocialProvider', () => {
    it('should return true for social providers', () => {
      expect(Provider.google().isSocialProvider()).toBe(true);
      expect(Provider.github().isSocialProvider()).toBe(true);
      expect(Provider.create('microsoft').getValue().isSocialProvider()).toBe(true);
      expect(Provider.create('apple').getValue().isSocialProvider()).toBe(true);
    });

    it('should return false for non-social providers', () => {
      expect(Provider.email().isSocialProvider()).toBe(false);
      expect(Provider.jwt().isSocialProvider()).toBe(false);
      expect(Provider.create('api_key').getValue().isSocialProvider()).toBe(false);
      expect(Provider.anonymous().isSocialProvider()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same provider', () => {
      const provider1 = Provider.google();
      const provider2 = Provider.google();

      expect(provider1.equals(provider2)).toBe(true);
    });

    it('should return false for different providers', () => {
      const provider1 = Provider.google();
      const provider2 = Provider.github();

      expect(provider1.equals(provider2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const provider = Provider.google();

      expect(provider.equals(null as any)).toBe(false);
      expect(provider.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const provider = Provider.google();
      expect(provider.toString()).toBe('google');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const provider = Provider.google();
      expect(provider.toJSON()).toBe('google');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const provider = Provider.google();

      expect(() => {
        (provider as any).value = 'github';
      }).toThrow();
    });
  });
});
