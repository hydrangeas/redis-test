# レスポンシブデザインガイド

## 概要

このプロジェクトは、モバイル、タブレット、デスクトップのすべてのデバイスで最適な表示を提供するレスポンシブデザインを実装しています。

## ブレークポイント

```typescript
export const breakpoints = {
  xs: 320, // 小型モバイル
  sm: 640, // モバイル
  md: 768, // タブレット
  lg: 1024, // デスクトップ
  xl: 1280, // 大型デスクトップ
  "2xl": 1536, // 超大型デスクトップ
};
```

## 主要コンポーネント

### ResponsiveHeader

- モバイルではハンバーガーメニューを表示
- デスクトップでは水平ナビゲーションを表示
- スクロールロック機能付きモバイルメニュー

### ResponsiveGrid

```tsx
<ResponsiveGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</ResponsiveGrid>
```

### ResponsiveTable

- モバイル：カード形式で表示
- デスクトップ：従来のテーブル形式
- `hideOnMobile`オプションで列を制御

## ユーティリティ

### useMediaQuery フック

```typescript
const isMobile = useMediaQuery("(max-width: 768px)");
const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
const isDesktop = useMediaQuery("(min-width: 1024px)");
```

### レスポンシブユーティリティ関数

```typescript
import { isMobile, isTablet, isDesktop } from "@/utils/responsive";

if (isMobile()) {
  // モバイル専用の処理
}
```

## CSSクラス

### レスポンシブテキスト

```css
.text-responsive {
  font-size: clamp(0.875rem, 2vw, 1rem);
}

.heading-responsive {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}
```

### レスポンシブ余白

```css
.px-responsive {
  padding-left: clamp(1rem, 4vw, 2rem);
  padding-right: clamp(1rem, 4vw, 2rem);
}
```

### セーフエリア対応

```css
.safe-top {
  padding-top: env(safe-area-inset-top);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## ベストプラクティス

1. **モバイルファースト設計**

   - 基本スタイルはモバイル向けに記述
   - メディアクエリで大画面向けに拡張

2. **タッチ最適化**

   - 最小タップ領域: 44x44px
   - タップハイライトの無効化
   - アクティブ状態のフィードバック

3. **パフォーマンス考慮**

   - 条件付きレンダリングでモバイル専用コンポーネントを制御
   - 画像の遅延読み込み
   - 不要な再レンダリングの防止

4. **アクセシビリティ**
   - aria-labelの適切な使用
   - フォーカス管理
   - キーボードナビゲーション対応

## テスト

レスポンシブデザインのテストは以下の観点で実施：

1. **ビューポートテスト**

   - 各ブレークポイントでの表示確認
   - 画面回転時の動作確認

2. **インタラクションテスト**

   - タッチ操作の確認
   - ホバー状態の確認

3. **実機テスト**
   - iOS Safari
   - Android Chrome
   - タブレットブラウザ
