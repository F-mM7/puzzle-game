// パズル生成の設定パラメータ

// 評価関数の底パラメータ
// A = Math.E (≈2.718): デフォルト動作
// A > Math.E: より小さいピースを優先的に併合（細かいピースが多いパズル）
// A < Math.E: サイズの差を緩和した併合（均等なサイズのピースが多いパズル）
export const PUZZLE_GENERATION_CONFIG = {
  evaluationBase: 3, // Math.Eより大きい値：細かいピースが多いパズルを生成
};

// 将来的な拡張用の設定取得関数
export const getEvaluationBase = (): number => {
  return PUZZLE_GENERATION_CONFIG.evaluationBase;
};

// 設定を変更する関数（テストやデバッグ用）
export const setEvaluationBase = (base: number): void => {
  if (base <= 0) {
    throw new Error('Evaluation base must be positive');
  }
  PUZZLE_GENERATION_CONFIG.evaluationBase = base;
};