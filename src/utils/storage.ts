import type { SavedGameState } from '../types/storage';
import type { Puzzle } from '../types/puzzle';
import { STORAGE_KEY, CURRENT_VERSION } from '../types/storage';

/**
 * LocalStorageが利用可能かチェック
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * ゲーム状態をLocalStorageに保存
 */
export const saveGameState = (state: SavedGameState): boolean => {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const stateWithVersion = {
      ...state,
      version: CURRENT_VERSION
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithVersion));
    return true;
  } catch (error) {
    console.error('Failed to save game state:', error);
    return false;
  }
};

/**
 * LocalStorageからゲーム状態を読み込み
 */
export const loadGameState = (): SavedGameState | null => {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);
    
    // データ検証
    if (!validateSavedState(parsed)) {
      console.warn('Invalid saved game state, falling back to new game');
      clearGameState();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load game state:', error);
    clearGameState();
    return null;
  }
};

/**
 * 保存データをクリア
 */
export const clearGameState = (): void => {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
};

/**
 * PuzzleからSavedGameStateに変換
 */
export const puzzleToSavedState = (puzzle: Puzzle): SavedGameState => {
  return {
    version: '', // saveGameStateで自動設定される
    puzzleSize: puzzle.size,
    pieces: puzzle.pieces.map(piece => ({
      id: piece.id,
      cells: piece.cells,
      color: piece.color
    }))
  };
};

/**
 * 保存データの検証（型ガード）
 */
export const validateSavedState = (state: unknown): state is SavedGameState => {
  if (!state || typeof state !== 'object') {
    return false;
  }

  const s = state as Record<string, unknown>;

  // 基本プロパティの確認
  if (typeof s.version !== 'string' ||
      typeof s.puzzleSize !== 'number' ||
      !Array.isArray(s.pieces)) {
    return false;
  }

  // バージョンチェック（異なる場合は即座にfalse）
  if (s.version !== CURRENT_VERSION) {
    return false;
  }

  // ピースデータの検証
  for (const piece of s.pieces) {
    if (!piece ||
        typeof piece.id !== 'number' ||
        typeof piece.color !== 'string' ||
        !Array.isArray(piece.cells)) {
      return false;
    }

    // セルデータの検証
    for (const cell of piece.cells) {
      if (!cell ||
          typeof cell.x !== 'number' ||
          typeof cell.y !== 'number') {
        return false;
      }
    }
  }

  return true;
};