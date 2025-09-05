export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  gridX: number;
  gridY: number;
}

export interface Cell {
  pieceId: number | null;
}

export interface Piece {
  id: number;
  cells: Position[];
  color: string;
  // 新しい位置管理方式
  gridPosition?: GridPosition;    // 配置済みの場合のグリッド座標
  screenPosition?: Position;      // 未配置またはドラッグ中の画面座標
  isPlaced: boolean;
}

export interface Puzzle {
  pieces: Piece[];
  grid: Cell[][];
  size: number;
}