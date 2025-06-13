/**
 * ユーザーティアレベルの列挙型
 */
export enum TierLevel {
  TIER1 = 'TIER1',
  TIER2 = 'TIER2',
  TIER3 = 'TIER3',
}

/**
 * ティアレベルの順序（階層）
 * 数値が大きいほど上位のティア
 */
export const TierLevelOrder = {
  [TierLevel.TIER1]: 1,
  [TierLevel.TIER2]: 2,
  [TierLevel.TIER3]: 3,
} as const;

/**
 * ティアレベルが有効かどうかを検証
 */
export function isValidTierLevel(value: string): value is TierLevel {
  return Object.values(TierLevel).includes(value as TierLevel);
}

/**
 * 文字列からTierLevelへの変換
 */
export function parseTierLevel(value: string): TierLevel {
  const upperValue = value.toUpperCase();
  if (!isValidTierLevel(upperValue)) {
    throw new Error(`Invalid tier level: ${value}`);
  }
  return upperValue as TierLevel;
}