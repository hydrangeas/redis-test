import { JWTValidatorService } from '../jwt-validator.service';
import { createMockLogger } from '@/test/mocks/logger.mock';
import { Logger } from 'pino';

describe('JWTValidatorService', () => {
  let service: JWTValidatorService;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    service = new JWTValidatorService(mockLogger);
  });

  describe('validateToken', () => {
    // 有効なJWTトークンのモック（実際の署名検証は行わない）
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    it('should validate a properly formatted JWT token', async () => {
      const result = await service.validateToken(validToken);
      
      expect(result.isSuccess).toBe(true);
    });

    it('should validate a token with Bearer prefix', async () => {
      const tokenWithBearer = `Bearer ${validToken}`;
      const result = await service.validateToken(tokenWithBearer);
      
      expect(result.isSuccess).toBe(true);
    });

    it('should fail for empty token', async () => {
      const result = await service.validateToken('');
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should fail for null token', async () => {
      const result = await service.validateToken(null as any);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should fail for non-string token', async () => {
      const result = await service.validateToken(123 as any);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should fail for token with incorrect number of parts', async () => {
      const invalidToken = 'part1.part2'; // Missing third part
      const result = await service.validateToken(invalidToken);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_JWT_FORMAT');
    });

    it('should fail for token with invalid Base64URL encoding', async () => {
      const invalidToken = 'invalid!@#.part2.part3';
      const result = await service.validateToken(invalidToken);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_JWT_ENCODING');
    });

    it('should fail for malformed JWT', async () => {
      const malformedToken = 'abc.def.ghi'; // Valid format but not decodable
      const result = await service.validateToken(malformedToken);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('JWT_DECODE_ERROR');
    });
  });

  describe('decodeToken', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    it('should decode a valid JWT token', () => {
      const decoded = service.decodeToken(validToken);
      
      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('sub', '1234567890');
      expect(decoded).toHaveProperty('name', 'John Doe');
      expect(decoded).toHaveProperty('iat', 1516239022);
    });

    it('should decode a token with Bearer prefix', () => {
      const tokenWithBearer = `Bearer ${validToken}`;
      const decoded = service.decodeToken(tokenWithBearer);
      
      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('sub', '1234567890');
    });

    it('should return null for invalid token', () => {
      const decoded = service.decodeToken('invalid.token');
      
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = service.decodeToken('');
      
      expect(decoded).toBeNull();
    });

    it('should use type parameter for decoding', () => {
      interface CustomPayload {
        sub: string;
        name: string;
        iat: number;
      }
      
      const decoded = service.decodeToken<CustomPayload>(validToken);
      
      expect(decoded).toBeTruthy();
      if (decoded) {
        expect(decoded.sub).toBe('1234567890');
        expect(decoded.name).toBe('John Doe');
        expect(decoded.iat).toBe(1516239022);
      }
    });
  });
});