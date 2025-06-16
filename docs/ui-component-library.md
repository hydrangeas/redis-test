# UI Component Library

## 概要

このプロジェクトでは、再利用可能なUIコンポーネントライブラリを提供しています。
すべてのコンポーネントは、TypeScript、React、Tailwind CSSで構築され、アクセシビリティとレスポンシブデザインを考慮しています。

## コンポーネント一覧

### ボタン (Button)

様々なスタイルとサイズのボタンコンポーネント。

```tsx
import { Button } from "@/components/ui/Button";

// 基本的な使用方法
<Button variant="primary">クリック</Button>

// バリアント
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
<Button variant="link">Link</Button>

// サイズ
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// その他のプロパティ
<Button loading>読み込み中...</Button>
<Button disabled>無効</Button>
<Button fullWidth>全幅</Button>
<Button leftIcon={<Icon />}>アイコン付き</Button>
```

### アラート (Alert)

通知やメッセージを表示するコンポーネント。

```tsx
import { Alert } from "@/components/ui/Alert";

// バリアント
<Alert variant="info">情報メッセージ</Alert>
<Alert variant="success">成功メッセージ</Alert>
<Alert variant="warning">警告メッセージ</Alert>
<Alert variant="error">エラーメッセージ</Alert>

// タイトル付き
<Alert variant="info" title="お知らせ">
  詳細な説明文がここに入ります。
</Alert>

// 閉じるボタン付き
<Alert variant="success" dismissible onDismiss={() => console.log("閉じた")}>
  閉じることができるアラート
</Alert>
```

### カード (Card)

コンテンツをグループ化するためのコンテナコンポーネント。

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";

<Card>
  <CardHeader>
    <CardTitle>カードタイトル</CardTitle>
    <CardDescription>カードの説明文</CardDescription>
  </CardHeader>
  <CardContent>
    <p>カードの本文コンテンツ</p>
  </CardContent>
  <CardFooter>
    <Button>アクション</Button>
  </CardFooter>
</Card>

// オプション
<Card hover shadow="large" padding="large">
  ホバー効果と大きな影のカード
</Card>
```

### モーダル (Modal)

ダイアログやポップアップを表示するコンポーネント。

```tsx
import { Modal } from "@/components/ui/Modal";

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="モーダルタイトル"
  description="モーダルの説明"
>
  <p>モーダルのコンテンツ</p>
</Modal>

// サイズオプション
<Modal size="small">小さいモーダル</Modal>
<Modal size="large">大きいモーダル</Modal>
<Modal size="full">全幅モーダル</Modal>

// その他のオプション
<Modal closeOnOverlayClick={false}>外側クリックで閉じない</Modal>
<Modal showCloseButton={false}>閉じるボタンなし</Modal>
```

### フォームコンポーネント

#### Input

```tsx
import { Input } from "@/components/ui/Form/Input";

<Input label="メールアドレス" type="email" required />
<Input label="パスワード" type="password" helperText="8文字以上" />
<Input error helperText="エラーメッセージ" />
<Input variant="success" helperText="利用可能です" />
```

#### Textarea

```tsx
import { Textarea } from "@/components/ui/Form/Textarea";

<Textarea label="コメント" rows={4} />
<Textarea error helperText="必須項目です" />
```

#### Select

```tsx
import { Select } from '@/components/ui/Form/Select';

<Select
  label="国を選択"
  options={[
    { value: 'jp', label: '日本' },
    { value: 'us', label: 'アメリカ' },
    { value: 'uk', label: 'イギリス' },
  ]}
  placeholder="選択してください"
/>;
```

#### Checkbox

```tsx
import { Checkbox } from "@/components/ui/Form/Checkbox";

<Checkbox label="利用規約に同意する" />
<Checkbox label="ニュースレターを受け取る" helperText="いつでも解除できます" />
```

#### Radio

```tsx
import { RadioGroup } from '@/components/ui/Form/Radio';

<RadioGroup
  name="plan"
  label="プランを選択"
  options={[
    { value: 'free', label: '無料プラン' },
    { value: 'pro', label: 'プロプラン' },
    { value: 'enterprise', label: 'エンタープライズ' },
  ]}
  value={selectedPlan}
  onChange={setSelectedPlan}
/>;
```

### テーブル (Table)

データを表形式で表示するコンポーネント。

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from "@/components/ui/Table/Table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHeaderCell>名前</TableHeaderCell>
      <TableHeaderCell>メール</TableHeaderCell>
      <TableHeaderCell>役割</TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>山田太郎</TableCell>
      <TableCell>yamada@example.com</TableCell>
      <TableCell>管理者</TableCell>
    </TableRow>
  </TableBody>
</Table>

// オプション
<Table striped>ストライプ</Table>
<Table bordered>ボーダー付き</Table>
<Table hoverable>ホバー効果</Table>
```

## Storybook

コンポーネントの動作確認とドキュメントは、Storybookで提供されています。

```bash
# Storybookを起動
npm run storybook

# ビルド
npm run build-storybook
```

## アクセシビリティ

すべてのコンポーネントは以下のアクセシビリティ基準に準拠しています：

- 適切なARIAラベルとロール
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 色のコントラスト比の確保
- フォーカス管理

## テスト

すべてのコンポーネントには包括的なテストが含まれています：

```bash
# テストを実行
npm test

# カバレッジレポート
npm run test:coverage
```

## カスタマイズ

コンポーネントは `className` プロパティを通じてカスタマイズ可能です。
また、Tailwind CSSのユーティリティクラスを使用して、スタイルを拡張できます。

```tsx
<Button className="custom-class">カスタムボタン</Button>
<Card className="bg-blue-50 border-blue-200">カスタムカード</Card>
```
