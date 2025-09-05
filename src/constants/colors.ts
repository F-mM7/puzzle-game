/**
 * アプリケーション全体で使用するカラーパレット定義
 * 
 * 16色のパレット：識別しやすさと背景コントラストを重視
 */
export const COLOR_PALETTE = [
  // 基本色相 - 高彩度（識別しやすさ重視）
  '#E74C3C', // 1. 鮮やかな赤
  '#FF5722', // 2. オレンジレッド
  '#F39C12', // 3. 鮮やかなオレンジ  
  '#F1C40F', // 4. 黄色
  '#CDDC39', // 5. ライムグリーン
  '#2ECC71', // 6. 鮮やかな緑
  '#1ABC9C', // 7. ターコイズ
  '#3498DB', // 8. 鮮やかな青
  '#3F51B5', // 9. インディゴブルー
  '#9B59B6', // 10. 鮮やかな紫
  '#E91E63', // 11. マゼンタ
  
  // 補完色 - 明るい色調（背景との区別重視）
  '#FF6B35', // 12. 明るいオレンジ
  '#4FC3F7', // 13. ライトブルー
  '#FFB74D', // 14. ライトアンバー
  '#FF9800', // 15. アンバー
  '#26A69A', // 16. ライトティール
] as const;

/**
 * カラーパレットの色数
 */
export const COLOR_PALETTE_SIZE = COLOR_PALETTE.length;

/**
 * 色文字列をパレットインデックスに変換
 */
export const colorToIndex = (color: string): number => {
  const index = (COLOR_PALETTE as readonly string[]).indexOf(color);
  return index >= 0 ? index : 0; // 見つからない場合は0番目の色
};

/**
 * パレットインデックスを色文字列に変換
 */
export const indexToColor = (index: number): string => {
  return COLOR_PALETTE[index] || COLOR_PALETTE[0];
};