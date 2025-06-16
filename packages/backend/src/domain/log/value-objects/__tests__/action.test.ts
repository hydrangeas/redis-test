import { describe, it, expect } from 'vitest';
import { Action, ActionType } from '../action';

describe('Action', () => {
  describe('create', () => {
    it('有効なアクションタイプでアクションを作成する', () => {
      const result = Action.create(ActionType.LOGIN, { userId: 'user-123' });

      expect(result.isSuccess).toBe(true);
      expect(result.value.type).toBe(ActionType.LOGIN);
      expect(result.value.metadata).toEqual({ userId: 'user-123' });
    });

    it('メタデータなしでアクションを作成する', () => {
      const result = Action.create(ActionType.LOGOUT);

      expect(result.isSuccess).toBe(true);
      expect(result.value.type).toBe(ActionType.LOGOUT);
      expect(result.value.metadata).toEqual({});
    });

    it('無効なアクションタイプの場合はエラーを返す', () => {
      const result = Action.create('INVALID_TYPE' as ActionType);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('無効なアクションタイプです');
    });

    describe('メタデータ検証', () => {
      it('ログイン成功時にuserIdが必要', () => {
        const result = Action.create(ActionType.LOGIN, { provider: 'google' });

        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('ログイン成功時はuserIdが必要です');
      });

      it('ログイン失敗時はuserIdが不要', () => {
        const result = Action.create(ActionType.LOGIN_FAILED, {
          email: 'test@example.com',
          reason: 'Invalid credentials',
        });

        expect(result.isSuccess).toBe(true);
      });

      it('APIアクセス時にendpointとmethodが必要', () => {
        const result1 = Action.create(ActionType.API_ACCESS, { endpoint: '/api/data' });
        expect(result1.isFailure).toBe(true);
        expect(result1.error).toBe('APIアクセスにはendpointとmethodが必要です');

        const result2 = Action.create(ActionType.API_ACCESS, { method: 'GET' });
        expect(result2.isFailure).toBe(true);
        expect(result2.error).toBe('APIアクセスにはendpointとmethodが必要です');
      });

      it('レート制限超過時にuserId、limit、windowが必要', () => {
        const result1 = Action.create(ActionType.RATE_LIMIT_EXCEEDED, {
          userId: 'user-123',
          limit: 60,
        });
        expect(result1.isFailure).toBe(true);
        expect(result1.error).toBe('レート制限超過にはuserId、limit、windowが必要です');

        const result2 = Action.create(ActionType.RATE_LIMIT_EXCEEDED, {
          userId: 'user-123',
          limit: 60,
          window: 60,
        });
        expect(result2.isSuccess).toBe(true);
      });
    });
  });

  describe('ファクトリメソッド', () => {
    it('login()でログインアクションを作成する', () => {
      const action = Action.login('user-123', 'google');

      expect(action.type).toBe(ActionType.LOGIN);
      expect(action.metadata).toEqual({ userId: 'user-123', provider: 'google' });
    });

    it('loginFailed()でログイン失敗アクションを作成する', () => {
      const action = Action.loginFailed('test@example.com', 'Invalid password');

      expect(action.type).toBe(ActionType.LOGIN_FAILED);
      expect(action.metadata).toEqual({
        email: 'test@example.com',
        reason: 'Invalid password',
      });
    });

    it('logout()でログアウトアクションを作成する', () => {
      const action = Action.logout('user-123');

      expect(action.type).toBe(ActionType.LOGOUT);
      expect(action.metadata).toEqual({ userId: 'user-123' });
    });

    it('apiAccess()でAPIアクセスアクションを作成する', () => {
      const action = Action.apiAccess('/api/data', 'GET', 200);

      expect(action.type).toBe(ActionType.API_ACCESS);
      expect(action.metadata).toEqual({
        endpoint: '/api/data',
        method: 'GET',
        responseCode: 200,
      });
    });

    it('rateLimitExceeded()でレート制限超過アクションを作成する', () => {
      const action = Action.rateLimitExceeded('user-123', 60, 60);

      expect(action.type).toBe(ActionType.RATE_LIMIT_EXCEEDED);
      expect(action.metadata).toEqual({
        userId: 'user-123',
        limit: 60,
        window: 60,
      });
    });
  });

  describe('isSecurityRelevant', () => {
    it('セキュリティ関連のアクションを正しく識別する', () => {
      const securityActions = [
        Action.create(ActionType.LOGIN_FAILED).value,
        Action.create(ActionType.UNAUTHORIZED_ACCESS).value,
        Action.create(ActionType.RATE_LIMIT_EXCEEDED, { userId: 'u', limit: 1, window: 1 }).value,
        Action.create(ActionType.TOKEN_EXPIRED).value,
      ];

      securityActions.forEach((action) => {
        expect(action.isSecurityRelevant).toBe(true);
      });
    });

    it('非セキュリティアクションを正しく識別する', () => {
      const normalActions = [
        Action.login('user-123', 'google'),
        Action.logout('user-123'),
        Action.apiAccess('/api/data', 'GET', 200),
        Action.create(ActionType.TOKEN_REFRESH).value,
      ];

      normalActions.forEach((action) => {
        expect(action.isSecurityRelevant).toBe(false);
      });
    });
  });

  describe('equals', () => {
    it('同じタイプとメタデータのアクションは等しい', () => {
      const action1 = Action.login('user-123', 'google');
      const action2 = Action.login('user-123', 'google');

      expect(action1.equals(action2)).toBe(true);
    });

    it('異なるタイプのアクションは等しくない', () => {
      const action1 = Action.login('user-123', 'google');
      const action2 = Action.logout('user-123');

      expect(action1.equals(action2)).toBe(false);
    });

    it('異なるメタデータのアクションは等しくない', () => {
      const action1 = Action.login('user-123', 'google');
      const action2 = Action.login('user-123', 'github');

      expect(action1.equals(action2)).toBe(false);
    });

    it('nullまたはundefinedとの比較はfalseを返す', () => {
      const action = Action.login('user-123', 'google');

      expect(action.equals(null as any)).toBe(false);
      expect(action.equals(undefined as any)).toBe(false);
    });
  });

  describe('シリアライゼーション', () => {
    it('toString()でアクションタイプを返す', () => {
      const action = Action.login('user-123', 'google');

      expect(action.toString()).toBe('LOGIN');
    });

    it('toJSON()でアクションデータを返す', () => {
      const action = Action.login('user-123', 'google');
      const json = action.toJSON();

      expect(json).toEqual({
        type: 'LOGIN',
        metadata: { userId: 'user-123', provider: 'google' },
      });
    });

    it('メタデータがない場合はtoJSON()に含まれない', () => {
      const action = Action.create(ActionType.LOGOUT).value;
      const json = action.toJSON();

      expect(json).toEqual({ type: 'LOGOUT' });
    });
  });

  describe('不変性', () => {
    it('作成後のアクションは変更できない', () => {
      const action = Action.login('user-123', 'google');

      expect(() => {
        (action as any).type = ActionType.LOGOUT;
      }).toThrow();

      expect(() => {
        action.metadata.userId = 'different-user';
      }).toThrow();
    });
  });
});
