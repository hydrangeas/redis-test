import { describe, it, expect } from 'vitest';
import { JsonObject } from '../json-object';
import { ValidationError } from '@/domain/errors/validation-error';

describe('JsonObject', () => {
  describe('create', () => {
    it('should create a valid JsonObject', () => {
      const result = JsonObject.create({ name: 'test', value: 123 });
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toEqual({ name: 'test', value: 123 });
    });

    it('should fail when value is not an object', () => {
      const result1 = JsonObject.create(null as any);
      expect(result1.isFailure).toBe(true);
      expect(result1.getError()).toBeInstanceOf(ValidationError);
      expect(result1.getError().message).toBe('Value must be a valid object');

      const result2 = JsonObject.create('string' as any);
      expect(result2.isFailure).toBe(true);

      const result3 = JsonObject.create(123 as any);
      expect(result3.isFailure).toBe(true);
    });

    it('should fail when value is an array', () => {
      const result = JsonObject.create([1, 2, 3] as any);
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
    });
  });

  describe('get', () => {
    it('should get value by path', () => {
      const json = JsonObject.create({
        user: {
          name: 'John',
          age: 30,
          address: {
            city: 'Tokyo',
            country: 'Japan',
          },
        },
      }).getValue();

      expect(json.get('user.name')).toBe('John');
      expect(json.get('user.age')).toBe(30);
      expect(json.get('user.address.city')).toBe('Tokyo');
    });

    it('should return undefined for non-existent path', () => {
      const json = JsonObject.create({ user: { name: 'John' } }).getValue();

      expect(json.get('user.email')).toBeUndefined();
      expect(json.get('nonexistent')).toBeUndefined();
      expect(json.get('user.address.city')).toBeUndefined();
    });

    it('should handle edge cases', () => {
      const json = JsonObject.create({
        nullValue: null,
        zero: 0,
        empty: '',
        falseValue: false,
      }).getValue();

      expect(json.get('nullValue')).toBeNull();
      expect(json.get('zero')).toBe(0);
      expect(json.get('empty')).toBe('');
      expect(json.get('falseValue')).toBe(false);
    });

    it('should handle keys with dots correctly', () => {
      // Keys with dots are treated as nested paths
      const json = JsonObject.create({
        'dot.key': 'value', // This won't be accessible via get('dot.key')
        dot: { key: 'nested-value' }, // This will be accessible
      }).getValue();

      // get('dot.key') tries to access json.dot.key, not json['dot.key']
      expect(json.get('dot.key')).toBe('nested-value');

      // To access 'dot.key' directly, need to use the value property
      expect(json.value['dot.key']).toBe('value');
    });
  });

  describe('getOrDefault', () => {
    it('should return value when exists', () => {
      const json = JsonObject.create({ user: { name: 'John' } }).getValue();
      expect(json.getOrDefault('user.name', 'Default')).toBe('John');
    });

    it('should return default value when not exists', () => {
      const json = JsonObject.create({ user: {} }).getValue();
      expect(json.getOrDefault('user.name', 'Default')).toBe('Default');
      expect(json.getOrDefault('nonexistent', 100)).toBe(100);
    });
  });

  describe('has', () => {
    it('should check if path exists', () => {
      const json = JsonObject.create({
        user: { name: 'John', age: null },
      }).getValue();

      expect(json.has('user.name')).toBe(true);
      expect(json.has('user.age')).toBe(true); // null is still a value
      expect(json.has('user.email')).toBe(false);
      expect(json.has('nonexistent')).toBe(false);
    });
  });

  describe('set', () => {
    it('should set value at path', () => {
      const original = JsonObject.create({ user: { name: 'John' } }).getValue();
      const result = original.set('user.age', 30);

      expect(result.isSuccess).toBe(true);
      const updated = result.getValue();
      expect(updated.get('user.age')).toBe(30);
      expect(updated.get('user.name')).toBe('John');

      // Original should be unchanged
      expect(original.get('user.age')).toBeUndefined();
    });

    it('should create nested paths if they do not exist', () => {
      const original = JsonObject.create({ user: {} }).getValue();
      const result = original.set('user.address.city', 'Tokyo');

      expect(result.isSuccess).toBe(true);
      const updated = result.getValue();
      expect(updated.get('user.address.city')).toBe('Tokyo');
    });

    it('should overwrite existing values', () => {
      const original = JsonObject.create({
        user: { name: 'John', age: 30 },
      }).getValue();
      const result = original.set('user.age', 31);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().get('user.age')).toBe(31);
    });
  });

  describe('remove', () => {
    it('should remove value at path', () => {
      const original = JsonObject.create({
        user: { name: 'John', age: 30 },
      }).getValue();
      const result = original.remove('user.age');

      expect(result.isSuccess).toBe(true);
      const updated = result.getValue();
      expect(updated.has('user.age')).toBe(false);
      expect(updated.get('user.name')).toBe('John');
    });

    it('should handle non-existent paths gracefully', () => {
      const original = JsonObject.create({ user: {} }).getValue();
      const result = original.remove('user.nonexistent');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toEqual({ user: {} });
    });
  });

  describe('merge', () => {
    it('should merge two JsonObjects', () => {
      const obj1 = JsonObject.create({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      }).getValue();

      const obj2 = JsonObject.create({
        user: { email: 'john@example.com', age: 31 },
        preferences: { lang: 'en' },
      }).getValue();

      const result = obj1.merge(obj2);
      expect(result.isSuccess).toBe(true);

      const merged = result.getValue();
      expect(merged.get('user.name')).toBe('John');
      expect(merged.get('user.email')).toBe('john@example.com');
      expect(merged.get('user.age')).toBe(31); // Overwritten
      expect(merged.get('settings.theme')).toBe('dark');
      expect(merged.get('preferences.lang')).toBe('en');
    });

    it('should deep merge nested objects', () => {
      const obj1 = JsonObject.create({
        config: {
          database: { host: 'localhost', port: 5432 },
          cache: { ttl: 3600 },
        },
      }).getValue();

      const obj2 = JsonObject.create({
        config: {
          database: { username: 'admin' },
          logging: { level: 'info' },
        },
      }).getValue();

      const result = obj1.merge(obj2);
      const merged = result.getValue();

      expect(merged.get('config.database.host')).toBe('localhost');
      expect(merged.get('config.database.port')).toBe(5432);
      expect(merged.get('config.database.username')).toBe('admin');
      expect(merged.get('config.cache.ttl')).toBe(3600);
      expect(merged.get('config.logging.level')).toBe('info');
    });
  });

  describe('toJsonString', () => {
    it('should convert to JSON string', () => {
      const json = JsonObject.create({ name: 'test', value: 123 }).getValue();

      const compact = json.toJsonString();
      expect(compact).toBe('{"name":"test","value":123}');

      const pretty = json.toJsonString(true);
      expect(pretty).toContain('\n');
      expect(pretty).toContain('  "name": "test"');
    });
  });

  describe('fromJsonString', () => {
    it('should create from valid JSON string', () => {
      const jsonString = '{"name":"test","value":123}';
      const result = JsonObject.fromJsonString(jsonString);

      expect(result.isSuccess).toBe(true);
      const json = result.getValue();
      expect(json.get('name')).toBe('test');
      expect(json.get('value')).toBe(123);
    });

    it('should fail with invalid JSON string', () => {
      const result = JsonObject.fromJsonString('invalid json');
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
      expect(result.getError().message).toBe('Invalid JSON string');
    });
  });

  describe('utility methods', () => {
    const json = JsonObject.create({
      name: 'test',
      value: 123,
      nested: { key: 'value' },
    }).getValue();

    it('should get keys', () => {
      const keys = json.keys();
      expect(keys).toEqual(['name', 'value', 'nested']);
    });

    it('should get values', () => {
      const values = json.values();
      expect(values).toContain('test');
      expect(values).toContain(123);
      expect(values.find((v) => v.key === 'value')).toBeTruthy();
    });

    it('should get entries', () => {
      const entries = json.entries();
      expect(entries).toContainEqual(['name', 'test']);
      expect(entries).toContainEqual(['value', 123]);
      expect(entries.length).toBe(3);
    });

    it('should check if empty', () => {
      expect(json.isEmpty()).toBe(false);
      expect(JsonObject.empty().isEmpty()).toBe(true);
    });
  });

  describe('empty', () => {
    it('should create empty JsonObject', () => {
      const empty = JsonObject.empty();
      expect(empty.isEmpty()).toBe(true);
      expect(empty.keys()).toEqual([]);
      expect(empty.value).toEqual({});
    });
  });

  describe('immutability', () => {
    it('should return a copy of value', () => {
      const original = { name: 'test' };
      const json = JsonObject.create(original).getValue();

      const value = json.value;
      value.name = 'changed';

      expect(json.get('name')).toBe('test'); // Should not be affected
    });
  });
});
