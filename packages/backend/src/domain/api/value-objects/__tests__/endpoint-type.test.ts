import { describe, it, expect } from 'vitest';
import { EndpointType } from '../endpoint-type';

describe('EndpointType', () => {
  describe('create', () => {
    it('should create a public endpoint type', () => {
      const result = EndpointType.create('public');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('public');
      expect(result.getValue().isPublic()).toBe(true);
      expect(result.getValue().isProtected()).toBe(false);
      expect(result.getValue().isInternal()).toBe(false);
    });

    it('should create a protected endpoint type', () => {
      const result = EndpointType.create('protected');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('protected');
      expect(result.getValue().isPublic()).toBe(false);
      expect(result.getValue().isProtected()).toBe(true);
      expect(result.getValue().isInternal()).toBe(false);
    });

    it('should create an internal endpoint type', () => {
      const result = EndpointType.create('internal');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('internal');
      expect(result.getValue().isPublic()).toBe(false);
      expect(result.getValue().isProtected()).toBe(false);
      expect(result.getValue().isInternal()).toBe(true);
    });

    it('should fail when type is empty', () => {
      const result = EndpointType.create('' as any);
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint type is required');
    });

    it('should fail with invalid type', () => {
      const result = EndpointType.create('invalid' as any);
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Invalid endpoint type: invalid');
    });
  });

  describe('static instances', () => {
    it('should provide PUBLIC instance', () => {
      expect(EndpointType.PUBLIC.value).toBe('public');
      expect(EndpointType.PUBLIC.isPublic()).toBe(true);
    });

    it('should provide PROTECTED instance', () => {
      expect(EndpointType.PROTECTED.value).toBe('protected');
      expect(EndpointType.PROTECTED.isProtected()).toBe(true);
    });

    it('should provide INTERNAL instance', () => {
      expect(EndpointType.INTERNAL.value).toBe('internal');
      expect(EndpointType.INTERNAL.isInternal()).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same types', () => {
      const type1 = EndpointType.create('public').getValue();
      const type2 = EndpointType.create('public').getValue();
      expect(type1.equals(type2)).toBe(true);
    });

    it('should return false for different types', () => {
      const type1 = EndpointType.create('public').getValue();
      const type2 = EndpointType.create('protected').getValue();
      expect(type1.equals(type2)).toBe(false);
    });

    it('should return false for null', () => {
      const type = EndpointType.create('public').getValue();
      expect(type.equals(null as any)).toBe(false);
    });

    it('should work with static instances', () => {
      const type = EndpointType.create('public').getValue();
      expect(type.equals(EndpointType.PUBLIC)).toBe(true);
      expect(type.equals(EndpointType.PROTECTED)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the type value', () => {
      const type = EndpointType.create('protected').getValue();
      expect(type.toString()).toBe('protected');
    });
  });
});
