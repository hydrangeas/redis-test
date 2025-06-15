#!/usr/bin/env python3
"""
Open Data API Client Example - Python

このサンプルコードは、Open Data APIの基本的な使用方法を示しています。
"""

import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
import requests
from urllib.parse import urljoin


class OpenDataAPIError(Exception):
    """API エラーの基底クラス"""
    def __init__(self, message: str, status_code: int = None, error_type: str = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_type = error_type
        self.retry_after = None


class RateLimitError(OpenDataAPIError):
    """レート制限エラー"""
    def __init__(self, message: str, retry_after: int):
        super().__init__(message, 429, 'rate-limit-exceeded')
        self.retry_after = retry_after


class OpenDataAPIClient:
    """Open Data API クライアント"""
    
    def __init__(self, base_url: str = 'https://api.example.com/api/v1',
                 access_token: str = None, refresh_token: str = None):
        """
        Args:
            base_url: API のベース URL
            access_token: アクセストークン
            refresh_token: リフレッシュトークン
        """
        self.base_url = base_url.rstrip('/')
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.session = requests.Session()
        self.rate_limit = {
            'limit': None,
            'remaining': None,
            'reset': None
        }
    
    def _update_rate_limit(self, response: requests.Response):
        """レート制限情報を更新"""
        headers = response.headers
        
        if 'X-RateLimit-Limit' in headers:
            self.rate_limit['limit'] = int(headers['X-RateLimit-Limit'])
        if 'X-RateLimit-Remaining' in headers:
            self.rate_limit['remaining'] = int(headers['X-RateLimit-Remaining'])
        if 'X-RateLimit-Reset' in headers:
            self.rate_limit['reset'] = datetime.fromtimestamp(
                int(headers['X-RateLimit-Reset'])
            )
    
    def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """HTTP リクエストを送信
        
        Args:
            method: HTTP メソッド
            path: API パス
            **kwargs: requests のオプション引数
            
        Returns:
            レスポンスデータ
            
        Raises:
            OpenDataAPIError: API エラー
        """
        url = urljoin(self.base_url, path.lstrip('/'))
        
        # ヘッダーの設定
        headers = kwargs.get('headers', {})
        headers['Content-Type'] = 'application/json'
        
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        kwargs['headers'] = headers
        
        # リクエスト送信
        response = self.session.request(method, url, **kwargs)
        
        # レート制限情報を更新
        self._update_rate_limit(response)
        
        # 成功レスポンス
        if response.ok:
            if response.status_code == 204:
                return None
            return response.json()
        
        # エラーレスポンス
        try:
            error_data = response.json()
            error_message = error_data.get('detail', error_data.get('title', 'Unknown error'))
            error_type = error_data.get('type', '')
        except json.JSONDecodeError:
            error_message = f'HTTP {response.status_code} Error'
            error_type = ''
        
        # レート制限エラー
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            raise RateLimitError(error_message, retry_after)
        
        # その他のエラー
        raise OpenDataAPIError(error_message, response.status_code, error_type)
    
    def refresh_access_token(self) -> Dict[str, Any]:
        """トークンをリフレッシュ
        
        Returns:
            新しいトークン情報
        """
        if not self.refresh_token:
            raise ValueError('Refresh token is required')
        
        response = self._request('POST', '/auth/refresh', json={
            'refresh_token': self.refresh_token
        })
        
        self.access_token = response['access_token']
        self.refresh_token = response['refresh_token']
        
        return response
    
    def get_data(self, path: str, etag: Optional[str] = None) -> Tuple[Dict[str, Any], str]:
        """データを取得
        
        Args:
            path: データファイルのパス
            etag: 条件付きリクエスト用の ETag
            
        Returns:
            (データ, ETag) のタプル
        """
        headers = {}
        if etag:
            headers['If-None-Match'] = etag
        
        try:
            response = self._request('GET', f'/data/{path}', headers=headers)
            return response['data'], response['metadata']['etag']
        except OpenDataAPIError as e:
            if e.status_code == 304:
                # Not Modified
                return None, etag
            raise
    
    def logout(self):
        """ログアウト"""
        self._request('POST', '/auth/logout')
        self.access_token = None
        self.refresh_token = None
    
    def check_health(self) -> Dict[str, Any]:
        """ヘルスチェック
        
        Returns:
            ヘルスチェック結果
        """
        # ヘルスチェックは認証不要
        token = self.access_token
        self.access_token = None
        
        try:
            return self._request('GET', '/../health')
        finally:
            self.access_token = token
    
    def check_detailed_health(self) -> Dict[str, Any]:
        """詳細ヘルスチェック
        
        Returns:
            詳細ヘルスチェック結果
        """
        token = self.access_token
        self.access_token = None
        
        try:
            return self._request('GET', '/../health/detailed')
        finally:
            self.access_token = token


def fetch_with_retry(client: OpenDataAPIClient, path: str, 
                    max_retries: int = 3) -> Dict[str, Any]:
    """自動リトライ付きデータ取得
    
    Args:
        client: API クライアント
        path: データパス
        max_retries: 最大リトライ回数
        
    Returns:
        データ
    """
    for attempt in range(max_retries):
        try:
            data, _ = client.get_data(path)
            return data
        
        except RateLimitError as e:
            # レート制限エラーの場合は待機
            print(f'Rate limited. Waiting {e.retry_after} seconds...')
            time.sleep(e.retry_after)
            
        except OpenDataAPIError as e:
            if e.status_code == 401 and attempt < max_retries - 1:
                # 認証エラーの場合はトークンをリフレッシュ
                print('Token expired. Refreshing...')
                client.refresh_access_token()
                continue
            raise
    
    raise Exception(f'Failed after {max_retries} retries')


def fetch_multiple_data(client: OpenDataAPIClient, paths: list, 
                       batch_size: int = 5) -> list:
    """複数データの取得（レート制限考慮）
    
    Args:
        client: API クライアント
        paths: データパスのリスト
        batch_size: 同時リクエスト数
        
    Returns:
        結果のリスト
    """
    results = []
    
    for i in range(0, len(paths), batch_size):
        batch = paths[i:i + batch_size]
        
        for path in batch:
            try:
                data, etag = client.get_data(path)
                results.append({
                    'path': path,
                    'data': data,
                    'etag': etag,
                    'success': True
                })
            except Exception as e:
                results.append({
                    'path': path,
                    'error': str(e),
                    'success': False
                })
        
        # レート制限に余裕を持たせる
        if (client.rate_limit['remaining'] is not None and 
            client.rate_limit['remaining'] < 10 and 
            i + batch_size < len(paths)):
            print('Rate limit low. Waiting 5 seconds...')
            time.sleep(5)
    
    return results


class CachedDataFetcher:
    """キャッシュ機能付きデータフェッチャー"""
    
    def __init__(self, client: OpenDataAPIClient):
        self.client = client
        self.cache = {}  # path -> (data, etag)
    
    def get(self, path: str) -> Dict[str, Any]:
        """キャッシュを活用してデータを取得
        
        Args:
            path: データパス
            
        Returns:
            データ
        """
        cached_data, cached_etag = self.cache.get(path, (None, None))
        
        try:
            data, etag = self.client.get_data(path, cached_etag)
            
            if data is None:
                # Not Modified - キャッシュを返す
                print(f'Using cached data for {path}')
                return cached_data
            
            # キャッシュを更新
            self.cache[path] = (data, etag)
            return data
            
        except OpenDataAPIError as e:
            if e.status_code == 404 and cached_data:
                # データが削除された場合はキャッシュをクリア
                del self.cache[path]
            raise


def main():
    """使用例"""
    # クライアントの初期化
    client = OpenDataAPIClient(
        base_url='http://localhost:3000/api/v1',
        access_token='your-access-token',
        refresh_token='your-refresh-token'
    )
    
    try:
        # 1. 基本的なデータ取得
        print('=== データ取得 ===')
        data, etag = client.get_data('secure/319985/r5.json')
        print(f'Data: {json.dumps(data, ensure_ascii=False, indent=2)}')
        print(f'ETag: {etag}')
        print(f'Rate Limit: {client.rate_limit}')
        
        # 2. 条件付きリクエスト
        print('\n=== 条件付きリクエスト ===')
        data2, etag2 = client.get_data('secure/319985/r5.json', etag)
        if data2 is None:
            print('Data not modified')
        
        # 3. エラーハンドリング
        print('\n=== エラーハンドリング ===')
        try:
            client.get_data('secure/nonexistent.json')
        except OpenDataAPIError as e:
            print(f'Error: {e}')
            print(f'Status: {e.status_code}')
            print(f'Type: {e.error_type}')
        
        # 4. ヘルスチェック
        print('\n=== ヘルスチェック ===')
        health = client.check_health()
        print(f'API Status: {health["status"]}')
        
        # 5. キャッシュを使用した取得
        print('\n=== キャッシュ機能 ===')
        fetcher = CachedDataFetcher(client)
        data1 = fetcher.get('secure/319985/r5.json')
        data2 = fetcher.get('secure/319985/r5.json')  # キャッシュから取得
        
    except Exception as e:
        print(f'Error: {e}')
    
    finally:
        # ログアウト
        try:
            client.logout()
            print('\nLogged out successfully')
        except:
            pass


if __name__ == '__main__':
    main()