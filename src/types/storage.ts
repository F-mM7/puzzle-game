import type { Position } from './puzzle';

export interface SavedGameState {
  version: string;
  puzzleSize: number;
  pieces: Array<{
    id: number;
    cells: Position[];
    color: string;
  }>;
}

// URL共有用の最適化されたデータ形式（バイナリ圧縮用）
export interface URLPuzzleData {
  s: number;    // size
  p: Array<{    // pieces (IDは配列インデックスで代用)
    c: number[]; // cells (パック済み座標)
    cl: number; // color index
  }>;
}

export const STORAGE_KEY = 'currentGame';
export const CURRENT_VERSION = '1.0.0';