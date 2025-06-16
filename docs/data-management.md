# データ管理ガイドライン

## ディレクトリ構造

### /data/secure/

認証が必要なデータを配置します。APIを通じてのみアクセス可能です。

- **population/**: 人口統計データ
- **budget/**: 予算データ
- **statistics/**: 各種統計データ

### /data/public/

将来的に認証不要なデータを配置する予定のディレクトリです。

## ファイル命名規則

1. すべて小文字を使用
2. スペースはハイフン（-）で置換
3. 日本語ファイル名は避ける
4. 拡張子は必ず`.json`

例：

- ✅ `population-2024.json`
- ❌ `人口統計2024.JSON`

## JSONフォーマット

### 必須フィールド

```json
{
  "metadata": {
    "source": "データ提供元",
    "lastUpdated": "YYYY-MM-DD",
    "license": "ライセンス情報"
  }
}
```

### 日付フォーマット

- 日付：`YYYY-MM-DD`
- 日時：`YYYY-MM-DDTHH:mm:ssZ`（ISO 8601）

## データ更新手順

1. JSONファイルの検証

```bash
node scripts/validate-json.js
```

2. ファイルの配置

```bash
cp new-data.json data/secure/category/
```

3. アクセス権限の確認

```bash
ls -la data/secure/category/
```

## セキュリティ

1. **直接アクセスの防止**

   - `.htaccess`でディレクトリアクセスを制限
   - APIを通じてのみアクセス可能

2. **パストラバーサル対策**

   - ファイル名に`..`を含まない
   - 絶対パスを使用しない

3. **大容量ファイル対策**
   - 10MB以上のファイルは分割を検討
   - ストリーミング対応が必要な場合は別途相談

## トラブルシューティング

### JSONパースエラー

- UTF-8エンコーディングを確認
- JSONLintでの検証：https://jsonlint.com/

### ファイルが見つからない

- パスの大文字小文字を確認
- ファイル権限を確認（644推奨）

## APIエンドポイントマッピング

| URLパス                                      | ファイルパス                             |
| -------------------------------------------- | ---------------------------------------- |
| `/api/data/secure/population/2024.json`      | `/data/secure/population/2024.json`      |
| `/api/data/secure/budget/2024/general.json`  | `/data/secure/budget/2024/general.json`  |
| `/api/data/secure/statistics/education.json` | `/data/secure/statistics/education.json` |
