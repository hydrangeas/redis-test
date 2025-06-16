import { describe, it, expect } from 'vitest';
import { IPAddress } from '../ip-address';

describe('IPAddress', () => {
  describe('create', () => {
    it('should create valid IPv4 addresses', () => {
      const validIPv4s = [
        '192.168.1.1',
        '10.0.0.0',
        '172.16.0.1',
        '8.8.8.8',
        '255.255.255.255',
        '0.0.0.0',
      ];

      validIPv4s.forEach((ip) => {
        const result = IPAddress.create(ip);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(ip);
      });
    });

    it('should create valid IPv6 addresses', () => {
      const validIPv6s = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3::8a2e:370:7334',
        '::1',
        'fe80::1',
        '::ffff:192.168.1.1',
      ];

      validIPv6s.forEach((ip) => {
        const result = IPAddress.create(ip);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(ip);
      });
    });

    it('should trim whitespace', () => {
      const result = IPAddress.create('  192.168.1.1  ');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('192.168.1.1');
    });

    it('should fail for empty or invalid addresses', () => {
      const result1 = IPAddress.create('');
      expect(result1.isFailure).toBe(true);
      expect(result1.getError()).toBe('IPアドレスは空にできません');

      const result2 = IPAddress.create('   ');
      expect(result2.isFailure).toBe(true);

      const result3 = IPAddress.create('999.999.999.999');
      expect(result3.isFailure).toBe(true);
      expect(result3.getError()).toBe('無効なIPアドレス形式です');

      const result4 = IPAddress.create('not.an.ip.address');
      expect(result4.isFailure).toBe(true);
    });
  });

  describe('unknown', () => {
    it('should create unknown IP address', () => {
      const result = IPAddress.unknown();
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('0.0.0.0');
    });
  });

  describe('isValid', () => {
    it('should validate IP addresses', () => {
      const valid = IPAddress.create('192.168.1.1').getValue();
      expect(valid.isValid()).toBe(true);

      const valid6 = IPAddress.create('::1').getValue();
      expect(valid6.isValid()).toBe(true);
    });
  });

  describe('isIPv4 and isIPv6', () => {
    it('should identify IPv4 addresses', () => {
      const ipv4 = IPAddress.create('192.168.1.1').getValue();
      expect(ipv4.isIPv4()).toBe(true);
      expect(ipv4.isIPv6()).toBe(false);
    });

    it('should identify IPv6 addresses', () => {
      const ipv6 = IPAddress.create('2001:db8::1').getValue();
      expect(ipv6.isIPv4()).toBe(false);
      expect(ipv6.isIPv6()).toBe(true);
    });
  });

  describe('anonymize', () => {
    it('should anonymize IPv4 addresses', () => {
      const ip = IPAddress.create('192.168.1.100').getValue();
      const anonymized = ip.anonymize();
      expect(anonymized.value).toBe('192.168.1.0');
    });

    it('should anonymize IPv6 addresses', () => {
      const ip = IPAddress.create('2001:db8:85a3::8a2e:370:7334').getValue();
      const anonymized = ip.anonymize();
      expect(anonymized.value).toBe('2001:db8:85a3::8a2e:370:0');
    });
  });

  describe('isPrivate', () => {
    it('should identify private IPv4 addresses', () => {
      const privateIPs = ['10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.0.1', '127.0.0.1'];

      privateIPs.forEach((ip) => {
        const ipAddress = IPAddress.create(ip).getValue();
        expect(ipAddress.isPrivate()).toBe(true);
      });
    });

    it('should identify public IPv4 addresses', () => {
      const publicIPs = [
        '8.8.8.8',
        '1.1.1.1',
        '172.32.0.1', // Outside private range
        '192.169.0.1', // Outside private range
      ];

      publicIPs.forEach((ip) => {
        const ipAddress = IPAddress.create(ip).getValue();
        expect(ipAddress.isPrivate()).toBe(false);
      });
    });

    it('should identify private IPv6 addresses', () => {
      const privateIPv6s = ['::1', 'fc00::1', 'fd00::1', 'fe80::1'];

      privateIPv6s.forEach((ip) => {
        const ipAddress = IPAddress.create(ip).getValue();
        expect(ipAddress.isPrivate()).toBe(true);
      });
    });

    it('should identify public IPv6 addresses', () => {
      const publicIPv6 = IPAddress.create('2001:db8::1').getValue();
      expect(publicIPv6.isPrivate()).toBe(false);
    });
  });

  describe('isBlacklisted', () => {
    it('should return false by default', () => {
      const ip = IPAddress.create('192.168.1.1').getValue();
      expect(ip.isBlacklisted()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same IP addresses', () => {
      const ip1 = IPAddress.create('192.168.1.1').getValue();
      const ip2 = IPAddress.create('192.168.1.1').getValue();
      expect(ip1.equals(ip2)).toBe(true);
    });

    it('should return false for different IP addresses', () => {
      const ip1 = IPAddress.create('192.168.1.1').getValue();
      const ip2 = IPAddress.create('192.168.1.2').getValue();
      expect(ip1.equals(ip2)).toBe(false);
    });

    it('should return false for null', () => {
      const ip = IPAddress.create('192.168.1.1').getValue();
      expect(ip.equals(null as any)).toBe(false);
    });
  });

  describe('toString and toJSON', () => {
    it('should return IP address string', () => {
      const ip = IPAddress.create('192.168.1.1').getValue();
      expect(ip.toString()).toBe('192.168.1.1');
      expect(ip.toJSON()).toBe('192.168.1.1');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const ip = IPAddress.create('192.168.1.1').getValue();
      expect(() => {
        (ip as any)._value = '192.168.1.2';
      }).toThrow();
    });
  });
});
