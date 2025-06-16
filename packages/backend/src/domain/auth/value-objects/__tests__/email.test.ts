import { Email } from '../email';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

describe('Email', () => {
  describe('create', () => {
    it('正常なメールアドレスを作成できる', () => {
      const result = Email.create('test@example.com');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('test@example.com');
    });

    it('大文字を含むメールアドレスを小文字に正規化する', () => {
      const result = Email.create('Test@Example.COM');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('test@example.com');
    });

    it('前後の空白をトリミングする', () => {
      const result = Email.create('  test@example.com  ');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('test@example.com');
    });

    it('様々な有効なメールアドレス形式を受け入れる', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.com',
        'user@sub.example.com',
        'user@example.co.jp',
        '123@example.com',
      ];

      validEmails.forEach((email) => {
        const result = Email.create(email);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(email.toLowerCase());
      });
    });

    it('nullの場合エラーを返す', () => {
      const result = Email.create(null as any);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.code).toBe('EMAIL_REQUIRED');
      expect(result.error?.type).toBe(ErrorType.VALIDATION);
    });

    it('undefinedの場合エラーを返す', () => {
      const result = Email.create(undefined as any);

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('EMAIL_REQUIRED');
    });

    it('文字列以外の型の場合エラーを返す', () => {
      const result = Email.create(123 as any);

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('EMAIL_INVALID_TYPE');
      expect(result.error?.message).toBe('Email must be a string');
    });

    it('空文字の場合エラーを返す', () => {
      const result = Email.create('');

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('EMAIL_EMPTY');
    });

    it('空白のみの場合エラーを返す', () => {
      const result = Email.create('   ');

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('EMAIL_EMPTY');
    });

    it('255文字を超える場合エラーを返す', () => {
      const longEmail = 'a'.repeat(244) + '@example.com'; // 256文字
      const result = Email.create(longEmail);

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('EMAIL_TOO_LONG');
      expect(result.error?.message).toBe('Email must be 255 characters or less');
    });

    it('無効な形式の場合エラーを返す', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@@example.com',
        'user@example',
        'user example@example.com',
        'user@example..com',
        'user..name@example.com',
        '.user@example.com',
        'user.@example.com',
      ];

      invalidEmails.forEach((email) => {
        const result = Email.create(email);
        expect(result.isFailure).toBe(true);
        expect(result.error?.code).toBe('EMAIL_INVALID_FORMAT');
      });
    });
  });

  describe('getDomain', () => {
    it('ドメイン部分を取得できる', () => {
      const result = Email.create('user@example.com');

      expect(result.getValue().getDomain()).toBe('example.com');
    });

    it('サブドメインを含むドメインを取得できる', () => {
      const result = Email.create('user@mail.example.com');

      expect(result.getValue().getDomain()).toBe('mail.example.com');
    });
  });

  describe('getLocalPart', () => {
    it('ローカル部分を取得できる', () => {
      const result = Email.create('user@example.com');

      expect(result.getValue().getLocalPart()).toBe('user');
    });

    it('ドットを含むローカル部分を取得できる', () => {
      const result = Email.create('first.last@example.com');

      expect(result.getValue().getLocalPart()).toBe('first.last');
    });

    it('プラス記号を含むローカル部分を取得できる', () => {
      const result = Email.create('user+tag@example.com');

      expect(result.getValue().getLocalPart()).toBe('user+tag');
    });
  });

  describe('toString', () => {
    it('文字列表現を返す', () => {
      const result = Email.create('test@example.com');

      expect(result.getValue().toString()).toBe('test@example.com');
    });
  });

  describe('equals', () => {
    it('同じメールアドレスの場合trueを返す', () => {
      const email1 = Email.create('test@example.com').getValue();
      const email2 = Email.create('test@example.com').getValue();

      expect(email1.equals(email2)).toBe(true);
    });

    it('異なるメールアドレスの場合falseを返す', () => {
      const email1 = Email.create('test1@example.com').getValue();
      const email2 = Email.create('test2@example.com').getValue();

      expect(email1.equals(email2)).toBe(false);
    });

    it('大文字小文字の違いがあっても正規化後に同じならtrueを返す', () => {
      const email1 = Email.create('Test@Example.com').getValue();
      const email2 = Email.create('test@example.com').getValue();

      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('値オブジェクトは不変である', () => {
      const email = Email.create('test@example.com').getValue();

      expect(() => {
        (email as any).props.value = 'modified@example.com';
      }).toThrow();
    });
  });
});
