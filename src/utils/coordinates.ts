import type { Position, GridPosition } from '../types/puzzle';

/**
 * グリッド座標から画面座標への変換
 * ボード左上のグリッドセルの左上を(0,0)とする統一座標系
 */
export const gridToScreen = (
  gridPosition: GridPosition,
  gridOffset: Position,
  cellSize: number,
  piece: { cells: Position[] }
): Position => {
  // ピースの基準点を考慮
  const minX = Math.min(...piece.cells.map(c => c.x));
  const minY = Math.min(...piece.cells.map(c => c.y));
  
  // グリッド座標(gridX, gridY)にピースの左上セルを配置
  // ピースの描画位置は、その基準点を考慮してオフセットする
  const result = {
    x: gridOffset.x + gridPosition.gridX * cellSize - minX * cellSize,
    y: gridOffset.y + gridPosition.gridY * cellSize - minY * cellSize
  };
  
  return result;
};

/**
 * 画面座標からグリッド座標への変換
 * ボード左上のグリッドセルの左上を(0,0)とする
 */
export const screenToGrid = (
  screenPosition: Position,
  gridOffset: Position,
  cellSize: number,
  piece: { cells: Position[] }
): GridPosition => {
  // ピースをドロップした位置のグリッド座標を計算
  // ピースの基準点（左上のセル）がどのグリッド位置に来るかを計算
  const minX = Math.min(...piece.cells.map(c => c.x));
  const minY = Math.min(...piece.cells.map(c => c.y));
  
  // ピースの実際の左上角の座標
  const pieceTopLeftX = screenPosition.x + minX * cellSize;
  const pieceTopLeftY = screenPosition.y + minY * cellSize;
  
  // グリッドからの相対位置
  const relativeX = pieceTopLeftX - gridOffset.x;
  const relativeY = pieceTopLeftY - gridOffset.y;
  
  // グリッド座標（ボード左上を0,0とする）
  const rawGridX = relativeX / cellSize;
  const rawGridY = relativeY / cellSize;
  
  // 最も近いグリッド座標にスナップ
  const gridX = Math.round(rawGridX);
  const gridY = Math.round(rawGridY);
  
  return { gridX, gridY };
};

/**
 * gridOffsetが初期化済みかどうかを判定
 */
export const isGridOffsetInitialized = (gridOffset: Position): boolean => {
  return gridOffset.x >= 0 && gridOffset.y >= 0;
};

/**
 * ピースの現在の画面座標を取得（配置状況に応じて適切な座標を返す）
 */
export const getPieceScreenPosition = (
  piece: { gridPosition?: GridPosition; screenPosition?: Position; isPlaced: boolean; cells: Position[] },
  gridOffset: Position,
  cellSize: number
): Position => {
  // gridOffsetが未初期化の場合は既存のscreenPositionまたはデフォルト値を返す
  if (!isGridOffsetInitialized(gridOffset)) {
    return piece.screenPosition || { x: 0, y: 0 };
  }

  if (piece.isPlaced && piece.gridPosition) {
    // 配置済みの場合はグリッド座標から画面座標を計算
    return gridToScreen(piece.gridPosition, gridOffset, cellSize, piece);
  } else {
    // 未配置の場合はscreen座標をそのまま使用
    return piece.screenPosition || { x: 0, y: 0 };
  }
};